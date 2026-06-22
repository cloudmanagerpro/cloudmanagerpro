create extension if not exists "pgcrypto";

create table users (
    id            uuid primary key,
    email         varchar(255) not null,
    password_hash varchar(255) not null,
    name          varchar(255) not null,
    role          varchar(32)  not null default 'USER',
    created_at    timestamptz  not null,
    updated_at    timestamptz  not null
);

create unique index ux_users_email on users (lower(email));
