-- ============ PERGUNTAS ============
UPDATE damage_categories SET name = '🔌 Seu aparelho liga normalmente?',
  help_text = 'Considera-se que liga: a tela acende, o sistema operacional inicia e você consegue navegar tocando na tela (incluindo remover contas e fazer reset).'
WHERE name = 'O seu aparelho liga?';

UPDATE damage_categories SET name = '📞 Você consegue fazer e receber ligações pela operadora?',
  help_text = 'Vale apenas chamadas pela rede móvel da operadora. Chamadas por WhatsApp, Telegram e similares não contam.'
WHERE name LIKE 'O aparelho faz e recebe ligações%';

UPDATE damage_categories SET name = '📶 Wi-Fi e Bluetooth funcionam direitinho?',
  help_text = 'O aparelho precisa conectar a uma rede Wi-Fi e abrir páginas no navegador. E pelo Bluetooth, conseguir receber arquivos sem problema.'
WHERE name LIKE 'A conectividade com wifi%';

UPDATE damage_categories SET name = '👀 O aparelho tem marcas de uso?'
WHERE name = 'Tem marcas de uso?';

UPDATE damage_categories SET name = '📱 A traseira ou as laterais têm algum dano?',
  help_text = 'Inclui trincos, riscos visíveis, partes descascando ou peças faltando (como botões).'
WHERE name LIKE 'O aparelho está com a parte traseira%';

UPDATE damage_categories SET name = '🖥️ A tela do aparelho tem algum problema?',
  help_text = 'Inclui trincos, rachaduras, riscos, manchas, burn-in (tons rosa/amarelo), tela fantasma, LCD vazando ou pixels queimados.'
WHERE name LIKE 'O aparelho está com a tela quebrada%';

UPDATE damage_categories SET name = '🔐 A biometria (Face ID ou digital) está funcionando?',
  help_text = 'Vale para Face ID, Touch ID, leitor de digital, scanner facial ou de íris. Você precisa conseguir cadastrar uma nova biometria.'
WHERE name LIKE 'O aparelho possui funcionalidade de Leitores Biométricos%';

UPDATE damage_categories SET name = '📸 As câmeras (frontal e traseira) tiram foto bem?',
  help_text = 'O aplicativo nativo de câmera precisa abrir e registrar fotos normalmente, tanto pela frontal quanto pelas traseiras.'
WHERE name LIKE 'As câmeras do dispositivo%';

UPDATE damage_categories SET name = '🔋 Qual a saúde da bateria do seu aparelho?'
WHERE name = 'Qual o nível de saúde da sua bateria?';

UPDATE damage_categories SET name = '⚙️ Aparece algum aviso de "peça não original" nos ajustes?',
  help_text = 'No iPhone, verifique em Ajustes > Bateria. Se aparecer "Peça não genuína" ou "Peça desconhecida", é esse aviso.'
WHERE name LIKE 'O dispositivo apresenta mensagem de peça%';

UPDATE damage_categories SET name = '💳 O pagamento por aproximação (NFC) funciona?'
WHERE name LIKE 'Voce consegue fazer pagamentos por proximidade%';

UPDATE damage_categories SET name = '🔧 Qual peça aparece no aviso?'
WHERE id = '960e7cab-37ae-4028-afa6-e11cf742e866';

UPDATE damage_categories SET name = '🛠️ E para a tela, é peça genuína ou desconhecida?'
WHERE id = 'bdb8de2b-711f-4f95-afa0-99d0a9a499bd';

UPDATE damage_categories SET name = '🛠️ E para a câmera, é peça genuína ou desconhecida?'
WHERE id = '5b9c926d-94a8-4cad-bc05-6ea744315981';

UPDATE damage_categories SET name = '🛠️ E para a bateria, é peça genuína ou desconhecida?'
WHERE id = '118aba64-b269-4905-9c06-ba88612b32d7';

UPDATE damage_categories SET name = '🩹 Como é o dano na tela?'
WHERE name = 'Como seria esse dano na tela?';

UPDATE damage_categories SET name = '🩹 Como é o dano?'
WHERE name = 'Como seria esse dano?';

-- ============ RESPOSTAS ============
UPDATE damage_deductions SET option_name = '✅ Sim, liga e funciona certinho'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🔌 Seu aparelho liga normalmente?') AND option_name = 'Sim';
UPDATE damage_deductions SET option_name = '❌ Não, ele não liga'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🔌 Seu aparelho liga normalmente?') AND option_name = 'Não';

UPDATE damage_deductions SET option_name = '✅ Sim, ligo normalmente'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '📞 Você consegue fazer e receber ligações pela operadora?') AND option_name = 'Sim';
UPDATE damage_deductions SET option_name = '❌ Não estou conseguindo'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '📞 Você consegue fazer e receber ligações pela operadora?') AND option_name = 'Não';

UPDATE damage_deductions SET option_name = '✅ Sim, conectam sem problema'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '📶 Wi-Fi e Bluetooth funcionam direitinho?') AND option_name = 'Sim';
UPDATE damage_deductions SET option_name = '❌ Não, dão problema'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '📶 Wi-Fi e Bluetooth funcionam direitinho?') AND option_name = 'Não';

UPDATE damage_deductions SET option_name = '✨ Está impecável, sem marcas'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '👀 O aparelho tem marcas de uso?') AND option_name = 'Não possui marcas de uso';
UPDATE damage_deductions SET option_name = '🙂 Tem leves marquinhas, quase invisíveis'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '👀 O aparelho tem marcas de uso?') AND option_name = 'Possui marcas de uso, quase que imperceptíveis';
UPDATE damage_deductions SET option_name = '👌 Tem marcas de uso visíveis'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '👀 O aparelho tem marcas de uso?') AND option_name = 'Possui marcas de uso visíveis';

UPDATE damage_deductions SET option_name = '✅ Não, está em ótimo estado'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '📱 A traseira ou as laterais têm algum dano?') AND option_name = 'Não';
UPDATE damage_deductions SET option_name = '⚠️ Sim, tem algum desses danos'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '📱 A traseira ou as laterais têm algum dano?') AND option_name = 'Sim';

UPDATE damage_deductions SET option_name = '✅ Não, a tela está perfeita'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🖥️ A tela do aparelho tem algum problema?') AND option_name = 'Não';
UPDATE damage_deductions SET option_name = '⚠️ Sim, a tela tem algum problema'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🖥️ A tela do aparelho tem algum problema?') AND option_name = 'Sim';

UPDATE damage_deductions SET option_name = '✅ Sim, está tudo certo'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🔐 A biometria (Face ID ou digital) está funcionando?') AND option_name = 'Sim';
UPDATE damage_deductions SET option_name = '❌ Não funciona ou não cadastra'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🔐 A biometria (Face ID ou digital) está funcionando?') AND option_name = 'Não';

UPDATE damage_deductions SET option_name = '✅ Não, ambas funcionam perfeitamente'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '📸 As câmeras (frontal e traseira) tiram foto bem?') AND option_name = 'Não';
UPDATE damage_deductions SET option_name = '❌ Sim, alguma tem defeito'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '📸 As câmeras (frontal e traseira) tiram foto bem?') AND option_name = 'Sim';

UPDATE damage_deductions SET option_name = '💚 Acima de 90% (ótima)'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🔋 Qual a saúde da bateria do seu aparelho?') AND option_name = 'Superior a 90%';
UPDATE damage_deductions SET option_name = '💛 Entre 80% e 90% (boa)'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🔋 Qual a saúde da bateria do seu aparelho?') AND option_name = 'Entre 80% a 90%';
UPDATE damage_deductions SET option_name = '🧡 Abaixo de 80% (precisa trocar)'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '🔋 Qual a saúde da bateria do seu aparelho?') AND option_name = 'Inferior a 80%';

UPDATE damage_deductions SET option_name = '✅ Não aparece nenhum aviso'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '⚙️ Aparece algum aviso de "peça não original" nos ajustes?') AND option_name = 'Não';
UPDATE damage_deductions SET option_name = '⚠️ Sim, aparece um aviso'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '⚙️ Aparece algum aviso de "peça não original" nos ajustes?') AND option_name = 'Sim';

UPDATE damage_deductions SET option_name = '✅ Sim, funciona normalmente'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '💳 O pagamento por aproximação (NFC) funciona?') AND option_name = 'Sim';
UPDATE damage_deductions SET option_name = '❌ Não funciona'
WHERE damage_category_id = (SELECT id FROM damage_categories WHERE name = '💳 O pagamento por aproximação (NFC) funciona?') AND option_name = 'Não';

UPDATE damage_deductions SET option_name = '🖥️ Mensagem na tela'
WHERE id = '4c216630-9b3b-4b64-8383-2f239337ee4f';
UPDATE damage_deductions SET option_name = '📸 Mensagem na câmera'
WHERE id = 'ca6b6619-2bd5-4452-b6d9-6af69f65ff85';
UPDATE damage_deductions SET option_name = '🔋 Mensagem na bateria'
WHERE id = 'b69f7e63-8eba-408a-881a-f8d797d99f4a';
UPDATE damage_deductions SET option_name = '🚫 Mensagem no Face ID ou rede celular'
WHERE damage_category_id = '960e7cab-37ae-4028-afa6-e11cf742e866' AND option_name = 'Mensagem de Face ID/Rede Celular';

UPDATE damage_deductions SET option_name = '✅ Peça genuína (original)'
WHERE damage_category_id IN ('bdb8de2b-711f-4f95-afa0-99d0a9a499bd','5b9c926d-94a8-4cad-bc05-6ea744315981','118aba64-b269-4905-9c06-ba88612b32d7')
  AND option_name = 'Peça genuína';
UPDATE damage_deductions SET option_name = '⚠️ Peça desconhecida (não original)'
WHERE damage_category_id IN ('bdb8de2b-711f-4f95-afa0-99d0a9a499bd','5b9c926d-94a8-4cad-bc05-6ea744315981','118aba64-b269-4905-9c06-ba88612b32d7')
  AND option_name = 'Peça desconhecida';

UPDATE damage_deductions SET option_name = '💥 Tela quebrada, trincada, com manchas ou toques fantasmas'
WHERE option_name = 'Tela quebrada, trinca, manchas ou toques fantasmas';
UPDATE damage_deductions SET option_name = '✏️ Tela apenas com riscos'
WHERE option_name = 'Tela com riscos';

UPDATE damage_deductions SET option_name = '🔨 Traseira trincada, quebrada ou arranhada'
WHERE option_name = 'Parte traseira trincada, quebrada ou arranhada';
UPDATE damage_deductions SET option_name = '🔨 Lateral com riscos, trincas ou rachaduras'
WHERE option_name = 'Parte lateral com riscos, trincas ou rachaduras';
UPDATE damage_deductions SET option_name = '🔘 Botão faltando'
WHERE option_name = 'Botões faltando';