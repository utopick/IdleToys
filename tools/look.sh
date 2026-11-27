#!/bin/sh
# Look at an entry: idletoys/tools/look.sh <url> <out-folder> [idleSeconds] [sizes]
exec node "$(dirname "$0")/look.mjs" "$@"
