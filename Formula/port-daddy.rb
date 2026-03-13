class PortDaddy < Formula
  desc "Authoritative port manager for multi-agent development"
  homepage "https://github.com/curiositech/port-daddy"
  url "https://github.com/curiositech/port-daddy/archive/refs/tags/v3.7.0.tar.gz"
  sha256 "REPLACE_WITH_ACTUAL_SHA256" # Placeholder for release pipeline
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/pd", "version"
  end
end
