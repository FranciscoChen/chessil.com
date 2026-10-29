The game server keeps a bounded pool of persistent `mg` processes. Each request
is one FEN line on stdin; each response is one legal-move list on stdout, including
an empty line when no moves are legal. Requests run sequentially within a worker.

`MG_WORKERS` controls workers per Node instance (default 1, range 1–32). With two
Node instances the default is two workers per VPS. Each pool allows 1024 queued
requests and gives requests two seconds total, including queue time. Overload and
worker failures return errors to the existing move handler; failed requests are
not replayed. A failed worker is killed and replaced after one second. Shutdown
rejects outstanding requests and kills all workers.

Build both tracked binaries with `sh mg/compile.sh` using a C++20 compiler. The
build targets x86-64 with BMI, BMI2 and POPCNT so deployments do not depend on the build host CPU.
The one-FEN command-line mode remains available for inspecting move lists.
