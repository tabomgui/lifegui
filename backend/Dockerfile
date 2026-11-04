FROM php:8.4-fpm-alpine

RUN apk add --no-cache libpng-dev libzip-dev icu-dev oniguruma-dev fcgi \
    && docker-php-ext-install pdo_mysql mbstring zip intl bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts --no-autoloader

COPY . .
RUN composer dump-autoload --optimize

COPY docker/php-fpm.d/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/php-fpm.d/mcp.conf /usr/local/etc/php-fpm.d/mcp.conf

EXPOSE 9000 9001
