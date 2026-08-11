FROM php:8.3-fpm-alpine

RUN apk add --no-cache libpng-dev libzip-dev icu-dev oniguruma-dev \
    && docker-php-ext-install pdo_mysql mbstring zip intl bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

EXPOSE 9000
CMD ["php-fpm"]
