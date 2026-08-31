.DEFAULT_GOAL := build

.PHONY: up
up: cli.install
	@gf up -a

.PHONY: build
build: cli.install
	@gf build -ew

.PHONY: ctrl
ctrl: cli.install
	@gf gen ctrl

.PHONY: dao
dao: cli.install
	@gf gen dao

.PHONY: enums
enums: cli.install
	@gf gen enums

.PHONY: service
service: cli.install
	@gf gen service

.PHONY: pb
pb: cli.install
	@gf gen pb

.PHONY: pbentity
pbentity: cli.install
	@gf gen pbentity
