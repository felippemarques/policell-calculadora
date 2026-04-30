## Humanização das perguntas e respostas da avaliação

### Backup (já feito)
Arquivos CSV gravados em `/mnt/documents/backup-humanizacao-2026-04-30/`:
- `damage_categories_BACKUP.csv` (perguntas)
- `damage_deductions_BACKUP.csv` (respostas)
- `condition_discounts_BACKUP.csv` (condições gerais)

Para reverter, basta me pedir "voltar para o backup" — eu releio os CSVs e restauro os textos originais.

### O que muda
Apenas o texto (`name`, `option_name`, `help_text`). **Não muda**: IDs, valores de desconto (`%`/`R$`), regras `is_rejected`, `is_required`, `display_order`, ordem das categorias, vínculos pai/filho (`parent_id`, `parent_option_id`).

### Perguntas (damage_categories) — 17 atualizadas

| Antes | Depois |
|---|---|
| O seu aparelho liga? | 🔌 Seu aparelho liga normalmente? |
| O aparelho faz e recebe ligações… | 📞 Você consegue fazer e receber ligações pela operadora? |
| A conectividade com wifi e bluetooth… | 📶 Wi-Fi e Bluetooth funcionam direitinho? |
| Tem marcas de uso? | 👀 O aparelho tem marcas de uso? |
| O aparelho está com a parte traseira… | 📱 A traseira ou as laterais têm algum dano? |
| O aparelho está com a tela quebrada… | 🖥️ A tela do aparelho tem algum problema? |
| O aparelho possui funcionalidade de Leitores Biométricos… | 🔐 A biometria (Face ID ou digital) está funcionando? |
| As câmeras do dispositivo apresentam algum problema… | 📸 As câmeras (frontal e traseira) tiram foto bem? |
| Qual o nível de saúde da sua bateria? | 🔋 Qual a saúde da bateria do seu aparelho? |
| O dispositivo apresenta mensagem de peça… | ⚙️ Aparece algum aviso de "peça não original" nos ajustes? |
| Voce consegue fazer pagamentos por proximidade? | 💳 O pagamento por aproximação (NFC) funciona? |
| Aparece mensagem de qual peça? | 🔧 Qual peça aparece no aviso? |
| Qual mensagem? *(disparada por "Mensagem de tela")* | 🛠️ E para a tela, é peça genuína ou desconhecida? |
| Qual mensagemm? *(disparada por "Mensagem de câmera")* | 🛠️ E para a câmera, é peça genuína ou desconhecida? |
| Qual mensagemmm? *(disparada por "Mensagem de bateria")* | 🛠️ E para a bateria, é peça genuína ou desconhecida? |
| Como seria esse dano na tela? | 🩹 Como é o dano na tela? |
| Como seria esse dano? | 🩹 Como é o dano? |

### Respostas (damage_deductions)
- Sim/Não viram frases com personalidade: "✅ Sim, liga e funciona certinho", "❌ Não estou conseguindo", "❌ Não funciona ou não cadastra", etc.
- Marcas de uso: ✨ impecável / 🙂 quase invisíveis / 👌 visíveis
- Bateria: 💚 acima de 90% (ótima) / 💛 80-90% (boa) / 🧡 abaixo de 80% (precisa trocar)
- Subopções de aviso de peça: 🖥️ Mensagem na tela / 📸 Mensagem na câmera / 🔋 Mensagem na bateria / 🚫 Mensagem no Face ID ou rede celular
- Sub-sub: ✅ Peça genuína (original) / ⚠️ Peça desconhecida (não original)
- Danos na tela: 💥 quebrada/manchas/toques fantasmas, ✏️ apenas com riscos
- Danos traseira: 🔨 traseira trincada, 🔨 lateral com riscos, 🔘 botão faltando

### Help text (textos de apoio)
Reescritos em tom amigável onde já existem (Liga, Ligações, Wi-Fi/BT, Câmeras) e adicionados nos que faziam sentido (Traseira/laterais, Tela, Biometria, Aviso de peça).

### Como será aplicado
1. Uma migration única com ~50 statements `UPDATE` em `damage_categories` e `damage_deductions`
2. Não toca em estrutura, só em texto
3. As 3 perguntas duplicadas ("Qual mensagem?" / "Qual mensagemm?" / "Qual mensagemmm?") são na verdade subperguntas legítimas disparadas por opções diferentes (tela/câmera/bateria) — vou renomear cada uma para refletir o contexto, sem deletar nem desativar nenhuma

### Como reverter depois
Posso restaurar tudo a partir dos CSVs em `/mnt/documents/backup-humanizacao-2026-04-30/` rodando uma migration de UPDATE inversa. É só pedir.