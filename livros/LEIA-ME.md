# Livros (fora do repositório)

Coloque aqui os PDFs dos livros de Tormenta 20. Eles não vão para o git (ver `.gitignore`),
mas é daqui que o Claude Code vai ler para confirmar qualquer regra.

Esperados:

- `T20 - Livro Basico.pdf`
- `T20 - Ameacas de Arton.pdf`

Para extrair texto, use sempre o modo `-layout`, porque o livro é em duas colunas:

```bash
pdftotext -layout "livros/T20 - Livro Basico.pdf" /tmp/livro.txt
grep -n -A6 "Nome do Poder" /tmp/livro.txt
```
