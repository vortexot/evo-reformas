# EVO — Reformas & Construções (site)

Site estático (HTML + CSS + JS). Basta abrir `index.html` no navegador ou publicar a pasta em qualquer hospedagem estática.

## Estrutura
- `index.html` — conteúdo e SEO (meta tags, JSON-LD)
- `css/style.css` — tokens de cor/tipografia, layout e responsivo
- `js/main.js` — interações (preloader, menu, cursor, scroll, projetos, processo)
- `assets/img/` — fotos do álbum da EVO (WebP, cores harmonizadas, sem metadados). Os arquivos com `simulacao` no nome são simulações de projeto e aparecem identificados na página
- `assets/evo-logo-original.png` — logo fornecida (favicon / og:image). A logo do site é um SVG desenhado a partir dela.

Bibliotecas via CDN: GSAP 3.12.5 + ScrollTrigger (cdnjs) e Lenis 1.1.13 (jsDelivr).
Sem essas bibliotecas, ou com "reduzir movimento" ativo no sistema, o site cai num modo estático totalmente utilizável.

## Substituir antes de publicar
| O quê | Onde |
|---|---|
| Número do WhatsApp (`5500000000000`) | `index.html` (vários links `wa.me`) e `js/main.js` (`waNumber`) |
| Telefone exibido `+55 (00) 00000-0000` | `index.html` (contato e rodapé) |
| E-mail `contato@evoreformas.com.br` | `index.html` |
| Links do Instagram / LinkedIn | `index.html` (menu e rodapé) |
| Horário de atendimento | `index.html` |
| Foto de “Reformas comerciais” (Unsplash, ilustrativa) | `index.html`, seção `#servicos` — trocar por foto real da EVO |
| Títulos e descrições dos projetos (escritos a partir das fotos) | `index.html`, seção `#projetos` — conferir e ajustar |
