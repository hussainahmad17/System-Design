# VM vs Docker Container

## What is a VM (Virtual Machine)?
A VM is a full computer emulated in software.
A **hypervisor** (e.g. VMware, VirtualBox, Hyper-V, KVM) splits one physical machine into many VMs.

Each VM has its own:
- **Virtual hardware:** virtual CPUs (vCPUs), RAM, disk, and network card, carved out of the host's real hardware.
- **Full OS:** its own kernel and operating system (e.g. a Linux VM on a Windows host).

## What is a Docker Container?
A container is **just an isolated process (or group of processes) running on the host's kernel**.
It does not have its own kernel or OS. It shares the host's kernel and only packages the app plus its libraries and dependencies.

## How Containers Are Isolated
Two Linux kernel features make a normal process behave like a separate machine:

- **Namespaces (what a container can see):** the kernel shows the container only the resources that belong to it.
  - **PID:** the container sees only its own processes (its app is process #1).
  - **NET:** its own network interfaces, IP address, and ports.
  - **MNT:** its own filesystem view.
  - **UTS:** its own hostname.
  - **USER:** its own user IDs (root inside can be a normal user outside).
  - **IPC:** its own inter-process communication.
- **cgroups (how much a container can use):** limit and track the CPU, memory, and disk I/O a container may consume, so one container cannot starve the others.

## Architecture

```
        Virtual Machines                     Docker Containers
 +---------+ +---------+ +---------+    +---------+ +---------+ +---------+
 |  App A  | |  App B  | |  App C  |    |  App A  | |  App B  | |  App C  |
 |  Libs   | |  Libs   | |  Libs   |    |  Libs   | |  Libs   | |  Libs   |
 | Guest OS| | Guest OS| | Guest OS|    +---------+ +---------+ +---------+
 | +Kernel | | +Kernel | | +Kernel |    |          Docker Engine          |
 +---------+ +---------+ +---------+    +---------------------------------+
 |           Hypervisor            |    |     Host OS + shared Kernel     |
 +---------------------------------+    +---------------------------------+
 |          Physical Hardware      |    |        Physical Hardware        |
 +---------------------------------+    +---------------------------------+
```

## Major Differences

| | VM | Docker Container |
|---|---|---|
| **Kernel** | Its own kernel | Shares the host's kernel |
| **OS** | Full guest OS | No OS, only app + dependencies |
| **Isolated by** | Hypervisor (hardware virtualization) | Namespaces + cgroups (OS-level) |
| **Size** | Gigabytes | Megabytes |
| **Startup time** | Minutes (boots a whole OS) | Seconds or less (starts a process) |
| **Resource overhead** | High (each VM runs a full OS) | Low (no extra OS) |
| **Density** | A few VMs per host | Dozens to hundreds of containers per host |
| **Security isolation** | Stronger (separate kernels) | Weaker (a kernel bug can affect all containers) |
| **Run a different OS** | Yes (e.g. Windows VM on a Linux host) | No, must match the host kernel (Linux containers need a Linux kernel) |
| **Portability** | VM images are large and heavy to move | Images are small and run the same everywhere |

## Note: Docker on Windows and Mac
Linux containers need a Linux kernel. On Windows and macOS, Docker Desktop runs a small, lightweight **Linux VM** in the background, and the containers share that VM's kernel.

## When to Use Which
- **Use a VM when:** you need a different OS or kernel, strong security isolation (e.g. untrusted code, multi-tenant hosting), or full control of the OS.
- **Use a container when:** you want to package and ship an app with its dependencies, start and scale fast (microservices), and run many services on the same machine.
- **In practice, both together:** cloud providers run containers *inside* VMs, so you get the VM's strong isolation plus the container's speed and portability.
