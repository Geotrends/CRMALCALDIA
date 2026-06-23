#!/bin/bash
set -euo pipefail

for i in {1..120}; do
  is_installed="$(php -r '
    $value = "";
    foreach (["/var/www/html/data/state.php", "/var/www/html/data/config-internal.php", "/var/www/html/data/config.php"] as $file) {
      if (!file_exists($file)) {
        continue;
      }
      $config = include $file;
      if (is_array($config) && array_key_exists("isInstalled", $config)) {
        $value = $config["isInstalled"] ? "1" : "0";
        break;
      }
    }
    echo $value;
  ')"

  if [ "$is_installed" = "1" ]; then
    exec bash /opt/bootstrap/repo/scripts/deploy-custom-dokploy.sh
  fi

  echo "Waiting for EspoCRM installation to finish ($i/120)..."
  sleep 5
done

echo "ERROR: EspoCRM installation did not complete in time."
exit 1
