#!/bin/bash
# mdiff.sh APKMID AIRMID [context]  -- normalized diff of decompiled module (air -> apk)
C=${3:-3}
norm() { sed 1d "$1" | sed -E 's/_fun[0-9]+/_f/g; s/_ip = [0-9]+/_ip = N/g; s/^\s*(case )?[0-9]+:$/L:/; s/Unsupported instruction: .*/UNSUP/'; }
diff -U$C <(norm /tmp/w/airmods/$2.js) <(norm /tmp/w/apkmods/$1.js)
