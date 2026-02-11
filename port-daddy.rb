class PortDaddy < Formula
  desc "Authoritative port assignment service for multi-agent development environments"
  homepage "https://github.com/erichowens/port-daddy"
  url "file:///Users/erichowens/.claude/port-daddy/port-daddy-1.0.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256"
  license "MIT"

  depends_on "node"

  def install
    # Install Node.js app
    libexec.install Dir["*"]

    # Create wrapper scripts in bin
    (bin/"get-port").write <<~EOS
      #!/bin/bash
      exec "#{libexec}/bin/get-port" "$@"
    EOS

    (bin/"release-port").write <<~EOS
      #!/bin/bash
      exec "#{libexec}/bin/release-port" "$@"
    EOS

    (bin/"list-ports").write <<~EOS
      #!/bin/bash
      exec "#{libexec}/bin/list-ports" "$@"
    EOS

    # Install npm dependencies
    system "npm", "install", "--production", "--prefix", libexec
  end

  def post_install
    # Install launchd daemon
    system "#{libexec}/install-daemon.js", "install"
  end

  def caveats
    <<~EOS
      Port Daddy has been installed as a launchd daemon.

      To start the service now:
        brew services start port-daddy

      Or to start manually:
        port-daddy-server

      Check status:
        curl http://localhost:9876/health

      CLI commands:
        get-port <project>      # Request port
        release-port <project>  # Release port
        list-ports              # List active ports
    EOS
  end

  service do
    run [opt_libexec/"server.js"]
    keep_alive true
    log_path var/"log/port-daddy.log"
    error_log_path var/"log/port-daddy-error.log"
  end

  test do
    # Start service temporarily
    fork do
      exec opt_libexec/"server.js"
    end

    sleep 2

    # Test health endpoint
    system "curl", "-sf", "http://localhost:9876/health"
  end
end
