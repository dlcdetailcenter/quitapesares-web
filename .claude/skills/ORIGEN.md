# Origen de las skills del proyecto

Regla del proyecto: skills solo de la organización oficial del fabricante, leídas antes, copiadas aquí con su commit de origen y solo para Claude Code.

## workers-best-practices

| Campo | Valor |
|---|---|
| Repositorio | https://github.com/cloudflare/skills (organización oficial de Cloudflare) |
| Commit de origen | `49a31e0b3229ccdffe4944be9c61bc7481d1d432` (2026-10-28) |
| Carpeta de origen | `skills/workers-best-practices` |
| Árbol git de la carpeta | `302f7f55037fe9396dfcd961d8877d020391104c` |
| Copiada | 2026-10-29, sin modificaciones |
| Licencia | Apache-2.0 (copia en `LICENSE-cloudflare-skills.txt`) |
| Scripts o ejecutables | Ninguno: 5 archivos Markdown (revisados permisos, extensiones y líneas `#!`) |
| Leída antes de copiarla | Sí, los 5 archivos |
| Uso | Solo Claude Code (`.claude/skills/`) |

`references/skill-feedback.md` describe cómo proponer issues públicas en `cloudflare/skills`. Es texto: no se publica nada sin aprobación explícita de Kara.

### Comprobar que no ha cambiado

En cualquier sistema (Windows incluido), este comando debe devolver el árbol de origen:

```sh
git rev-parse HEAD:.claude/skills/workers-best-practices
# 302f7f55037fe9396dfcd961d8877d020391104c
```

SHA-256 de cada archivo, tal como están en el repositorio de origen:

| Archivo | SHA-256 |
|---|---|
| `SKILL.md` | `01c452fd0b6b3caeb4c3b06f87893e52d8e95e32f691911c1644060e00dafa0e` |
| `references/configuration.md` | `d6153120cb3b5301652ca3dcafe5f729be1723a7d8b099c866e66be314c78de0` |
| `references/platform-apis.md` | `9ca9f5a7a82f92de45d310f5e2ee05aa464ddb7a63a737529caa17fff3660f28` |
| `references/runtime-patterns.md` | `1c9b106ec5a5887376844f7c1d427adc2f4801d3579ad4c81328f7d2a2b53d04` |
| `references/skill-feedback.md` | `7bc7ac3c0ba025e3d89d4672c734d5359f748cdfc70628028e27e626422a0655` |

En Windows, si Git convierte los finales de línea al descargar, las sumas SHA-256 del disco pueden no coincidir; el árbol git sí coincide siempre.
