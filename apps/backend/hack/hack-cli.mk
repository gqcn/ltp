.PHONY: cli
cli:
	@set -e; \
	wget -O gf https://github.com/gogf/gf/releases/latest/download/gf_$(shell go env GOOS)_$(shell go env GOARCH) && \
	chmod +x gf && \
	./gf install -y && \
	rm ./gf

.PHONY: cli.install
cli.install:
	@set -e; \
	gf -v >/dev/null 2>&1 || (echo "未安装 GoFrame CLI，开始自动安装..." && $(MAKE) cli)
