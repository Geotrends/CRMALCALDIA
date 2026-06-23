<?php

/**
 * En deploy por lotes (Dokploy) se hace un solo rebuild al final.
 */
function deploy_maybe_rebuild(\Espo\Core\Application $app): void
{
    if (getenv('ESPO_DEPLOY_BATCH') === '1') {
        echo "Rebuild diferido (deploy por lotes).\n";

        return;
    }

    $app->getContainer()->getByClass(\Espo\Core\DataManager::class)->rebuild();
}
