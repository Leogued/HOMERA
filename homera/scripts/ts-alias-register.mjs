/* Enregistre le résolveur d’alias et d’extensions pour les scripts Node
   qui exécutent directement les fichiers TypeScript du serveur. */

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(pathToFileURL(new URL("./ts-alias.mjs", import.meta.url).pathname).href, import.meta.url);
