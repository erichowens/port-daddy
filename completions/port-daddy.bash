#!/bin/bash

# Bash completion for Port Daddy CLI tools
# Install: source this file in ~/.bashrc or ~/.bash_profile
# Or copy to /etc/bash_completion.d/port-daddy

_get_port() {
  local cur prev projects

  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  # Get list of active projects from Port Daddy
  if command -v curl &> /dev/null; then
    projects=$(curl -s http://localhost:9876/ports/active 2>/dev/null | \
               grep -o '"project":"[^"]*"' | \
               cut -d'"' -f4 | \
               sort -u)
  fi

  # First argument: suggest active project names
  if [ $COMP_CWORD -eq 1 ]; then
    if [ -n "$projects" ]; then
      COMPREPLY=( $(compgen -W "$projects" -- "$cur") )
    fi
  fi

  # Second argument: suggest port numbers (3100-9999)
  if [ $COMP_CWORD -eq 2 ]; then
    if [[ $cur =~ ^[0-9]*$ ]]; then
      # Suggest common port ranges
      COMPREPLY=( $(compgen -W "3100 3200 3300 3400 3500 4000 5000 8000 9000" -- "$cur") )
    fi
  fi

  return 0
}

_release_port() {
  local cur prev projects ports

  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  # Get list of active projects and ports
  if command -v curl &> /dev/null; then
    local active=$(curl -s http://localhost:9876/ports/active 2>/dev/null)

    projects=$(echo "$active" | \
               grep -o '"project":"[^"]*"' | \
               cut -d'"' -f4 | \
               sort -u)

    ports=$(echo "$active" | \
            grep -o '"port":[0-9]*' | \
            cut -d: -f2 | \
            sort -u)
  fi

  # First argument: suggest project names or port numbers
  if [ $COMP_CWORD -eq 1 ]; then
    if [[ $cur =~ ^[0-9]*$ ]]; then
      # Completing a port number
      if [ -n "$ports" ]; then
        COMPREPLY=( $(compgen -W "$ports" -- "$cur") )
      fi
    else
      # Completing a project name
      if [ -n "$projects" ]; then
        COMPREPLY=( $(compgen -W "$projects" -- "$cur") )
      fi
    fi
  fi

  return 0
}

_list_ports() {
  # No arguments, so no completion needed
  COMPREPLY=()
  return 0
}

# Register completion functions
complete -F _get_port get-port
complete -F _release_port release-port
complete -F _list_ports list-ports
