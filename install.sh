#!/usr/bin/env bash
# Instalador do lifegui: instala na primeira execução e atualiza nas seguintes.
#
#   curl -fsSL https://raw.githubusercontent.com/tabomgui/lifegui/main/install.sh | bash
#
# Variáveis opcionais: LIFEGUI_URL, LIFEGUI_PORT, LIFEGUI_DIR, LIFEGUI_REF.
# Com LIFEGUI_URL definido, roda sem nenhuma pergunta.
#
# Todo o corpo fica em funções e main só roda na última linha: um download
# interrompido no meio do `curl | bash` não executa um script pela metade.
set -euo pipefail

REPO_URL="https://github.com/tabomgui/lifegui.git"
COMPOSE_FILE="docker-compose.prod.yml"
LIFEGUI_DIR="${LIFEGUI_DIR:-$HOME/lifegui}"
LIFEGUI_REF="${LIFEGUI_REF:-main}"
HEALTH_TIMEOUT=180
DOCKER=(docker)
MODE="install"

if [ -t 1 ]; then
  C_BLUE=$'\033[0;34m'; C_GREEN=$'\033[0;32m'; C_YELLOW=$'\033[1;33m'
  C_RED=$'\033[0;31m'; C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
  C_BLUE=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_BOLD=''; C_RESET=''
fi

info() { printf '%s[info]%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
ok()   { printf '%s[ok]%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s[warn]%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
fail() { printf '%s[error]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

# Com `curl | bash` o stdin é o próprio script: perguntas leem do terminal.
has_tty() { (exec < /dev/tty) 2>/dev/null; }

ask() {
  local prompt="$1" default="$2" answer=""
  if has_tty; then
    read -r -p "$prompt [$default]: " answer < /dev/tty || true
  fi
  printf '%s' "${answer:-$default}"
}

confirm() {
  local answer=""
  has_tty || return 1
  read -r -p "$1 [y/N]: " answer < /dev/tty || true
  case "$answer" in [yY]*) return 0 ;; *) return 1 ;; esac
}

compose() { "${DOCKER[@]}" compose -f "$COMPOSE_FILE" "$@"; }

env_value() { sed -n "s/^$1=//p" "$2" 2>/dev/null | head -n 1; }

detect_os() {
  case "$(uname -s)" in
    Linux) OS="linux" ;;
    Darwin) OS="macos" ;;
    *) fail "Unsupported system: $(uname -s). On Windows, run this installer inside WSL2." ;;
  esac
  ok "System: $OS"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required. Install it and run the installer again."
}

install_docker() {
  if [ "$OS" = "macos" ]; then
    fail "Docker not found. Install Docker Desktop (https://www.docker.com/products/docker-desktop/) or OrbStack (https://orbstack.dev), start it and run the installer again."
  fi
  confirm "Docker not found. Install it now with get.docker.com (requires sudo)?" \
    || fail "Docker is required. Install it (https://docs.docker.com/engine/install/) and run the installer again."
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo systemctl enable --now docker >/dev/null 2>&1 || true
  local me
  me="$(id -un)"
  if [ "$(id -u)" -ne 0 ] && ! id -nG "$me" | grep -qw docker; then
    sudo usermod -aG docker "$me"
    warn "Added $me to the docker group. This run uses sudo for docker; log out and back in to drop it."
  fi
  if [ "$(id -u)" -ne 0 ]; then
    DOCKER=(sudo docker)
  fi
  ok "Docker installed"
}

wait_for_docker() {
  local i
  for i in $(seq 1 15); do
    if "${DOCKER[@]}" info >/dev/null 2>&1; then
      ok "Docker is running"
      return 0
    fi
    [ "$i" -eq 1 ] && info "Waiting for the Docker daemon..."
    sleep 2
  done
  fail "The Docker daemon is not responding. Start Docker and run the installer again."
}

check_prereqs() {
  require_cmd git
  require_cmd curl
  require_cmd openssl
  command -v docker >/dev/null 2>&1 || install_docker
  wait_for_docker
  "${DOCKER[@]}" compose version >/dev/null 2>&1 \
    || fail "Docker Compose v2 (docker compose) not found. Update Docker and run the installer again."
  ok "Prerequisites found"
}

setup_repo() {
  if [ -d "$LIFEGUI_DIR/.git" ]; then
    info "Updating $LIFEGUI_DIR to $LIFEGUI_REF..."
    git -C "$LIFEGUI_DIR" fetch --quiet --tags origin
    git -C "$LIFEGUI_DIR" checkout --quiet "$LIFEGUI_REF"
    # Tag deixa o HEAD destacado: só branch recebe pull.
    if git -C "$LIFEGUI_DIR" symbolic-ref -q HEAD >/dev/null; then
      git -C "$LIFEGUI_DIR" pull --quiet --ff-only origin "$LIFEGUI_REF" \
        || fail "Could not fast-forward $LIFEGUI_DIR. Commit or discard local changes and run the installer again."
    fi
  elif [ -f "./$COMPOSE_FILE" ] && [ -f ./install.sh ]; then
    LIFEGUI_DIR="$(pwd)"
    info "Using the repository in $LIFEGUI_DIR"
  else
    [ -e "$LIFEGUI_DIR" ] && fail "$LIFEGUI_DIR exists and is not a lifegui clone. Set LIFEGUI_DIR to another path."
    info "Cloning lifegui into $LIFEGUI_DIR..."
    git clone --quiet --branch "$LIFEGUI_REF" "$REPO_URL" "$LIFEGUI_DIR"
  fi
  ok "Code ready ($(git -C "$LIFEGUI_DIR" rev-parse --short HEAD))"
}

configure() {
  if [ -f .env ] && [ -f backend/.env ]; then
    MODE="update"
    ok "Keeping existing configuration (.env, backend/.env)"
    return 0
  fi

  local url port scheme host url_port stateful secure db_password app_key
  url="${LIFEGUI_URL:-}"
  if [ -z "$url" ]; then
    url="$(ask "URL you will use to open lifegui" "http://localhost:8080")"
  fi
  url="${url%/}"
  [[ "$url" =~ ^(https?)://([A-Za-z0-9.-]+)(:([0-9]+))?$ ]] \
    || fail "Invalid URL: $url (expected http(s)://host[:port], without path)"
  scheme="${BASH_REMATCH[1]}"
  host="${BASH_REMATCH[2]}"
  url_port="${BASH_REMATCH[4]}"

  port="${LIFEGUI_PORT:-}"
  if [ -z "$port" ]; then
    if [ "$host" = "localhost" ] || [ "$host" = "127.0.0.1" ]; then
      # Acesso direto: a porta publicada é a própria porta da URL.
      if [ -n "$url_port" ]; then port="$url_port"; elif [ "$scheme" = "https" ]; then port=443; else port=80; fi
    elif [ -n "${LIFEGUI_URL:-}" ]; then
      port=8080
    else
      port="$(ask "Local port for the web container (point your proxy or tunnel here)" "8080")"
    fi
  fi
  [[ "$port" =~ ^[0-9]+$ ]] || fail "Invalid port: $port"

  stateful="$host${url_port:+:$url_port}"
  secure="false"
  [ "$scheme" = "https" ] && secure="true"

  if [ -f .env ]; then
    db_password="$(env_value DB_PASSWORD .env)"
  else
    db_password="$(openssl rand -hex 24)"
    printf 'DB_PASSWORD=%s\nLIFEGUI_PORT=%s\n' "$db_password" "$port" > .env
    chmod 600 .env
  fi

  if [ ! -f backend/.env ]; then
    app_key="base64:$(openssl rand -base64 32)"
    sed -e "s|__APP_KEY__|$app_key|g" \
        -e "s|__APP_URL__|$url|g" \
        -e "s|__DB_PASSWORD__|$db_password|g" \
        -e "s|__SESSION_DOMAIN__|$host|g" \
        -e "s|__SECURE_COOKIE__|$secure|g" \
        -e "s|__STATEFUL_DOMAINS__|$stateful|g" \
        backend/.env.production.example > backend/.env
    chmod 600 backend/.env
  fi

  ok "Configuration written for $url (port $port)"
}

start_services() {
  local version
  version="$(git rev-parse --short HEAD)"
  mkdir -p vaults oauth-keys
  info "Building images (the first run takes a few minutes)..."
  compose build backend
  compose build --build-arg APP_VERSION="$version" web
  info "Starting containers..."
  compose up -d
  ok "Containers started"
}

wait_for_health() {
  local port elapsed=0
  port="$(env_value LIFEGUI_PORT .env)"
  port="${port:-80}"
  info "Waiting for lifegui on port $port (up to ${HEALTH_TIMEOUT}s)..."
  while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
    if curl -fs -o /dev/null "http://localhost:$port/up" 2>/dev/null; then
      ok "lifegui is up"
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  warn "No answer after ${HEALTH_TIMEOUT}s. It may still be starting. Check the logs with:"
  warn "  cd $LIFEGUI_DIR && docker compose -f $COMPOSE_FILE logs -f backend"
  return 1
}

print_summary() {
  local url
  url="$(env_value APP_URL backend/.env)"
  printf '\n%s' "$C_BOLD"
  if [ "$MODE" = "install" ]; then
    printf 'lifegui is installed.%s\n\n' "$C_RESET"
    printf '  Open %s and create your account.\n\n' "$url"
  else
    printf 'lifegui is updated.%s\n\n' "$C_RESET"
    printf '  Open %s\n\n' "$url"
  fi
  printf '  Useful commands (run in %s):\n' "$LIFEGUI_DIR"
  printf '    docker compose -f %s logs -f    # follow logs\n' "$COMPOSE_FILE"
  printf '    docker compose -f %s ps         # container status\n' "$COMPOSE_FILE"
  printf '    docker compose -f %s down       # stop lifegui\n\n' "$COMPOSE_FILE"
}

main() {
  printf '\n%slifegui installer%s\n\n' "$C_BOLD" "$C_RESET"
  detect_os
  check_prereqs
  setup_repo
  cd "$LIFEGUI_DIR"
  configure
  start_services
  wait_for_health || true
  print_summary
}

main "$@"
