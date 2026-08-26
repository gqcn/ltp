.DEFAULT_GOAL := build

.PHONY: up build ctrl dao enums service pb pbentity

up: cli.install
	@gf up -a

build: cli.install
	@gf build -ew

ctrl: cli.install
	@gf gen ctrl

dao: cli.install
	@gf gen dao

enums: cli.install
	@gf gen enums

service: cli.install
	@gf gen service

pb: cli.install
	@gf gen pb

pbentity: cli.install
	@gf gen pbentity
