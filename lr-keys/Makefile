SWIFT ?= swift

.PHONY: test test-swift test-lua test-harness syntax test-catalog-sync

test: test-catalog-sync test-swift test-lua test-harness

test-catalog-sync:
	cmp Sources/LRKeysCore/Resources/develop-parameters.json plugin/LRKeys.lrplugin/develop-parameters.json

test-swift:
	$(SWIFT) test

test-lua:
	lua5.1 plugin/tests/test_core.lua

test-harness:
	python3 -m unittest discover -s harness -v

syntax:
	@find plugin/LRKeys.lrplugin -name '*.lua' -print0 | xargs -0 -n1 luac5.1 -p
	@echo "lua syntax ok"
