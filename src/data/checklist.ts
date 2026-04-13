export interface ChecklistOption {
  label: string;
  discountFixed: number;
  discountPercent: number;
  isCritical: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  options: ChecklistOption[];
}

export const checklistItems: ChecklistItem[] = [
  {
    id: "power",
    title: "Liga/Não Liga",
    description: "Verifica se o dispositivo liga e inicializa corretamente.",
    required: true,
    options: [
      { label: "Liga normalmente", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "Não liga", discountFixed: 0, discountPercent: 100, isCritical: true },
    ],
  },
  {
    id: "screen",
    title: "Estado da Tela",
    description: "Avalia a condição física da tela, incluindo riscos, trincas e funcionamento do touch.",
    required: true,
    options: [
      { label: "Perfeita", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "Pequenos riscos", discountFixed: 100, discountPercent: 0, isCritical: false },
      { label: "Riscos visíveis", discountFixed: 150, discountPercent: 0, isCritical: false },
      { label: "Trincada/Quebrada", discountFixed: 0, discountPercent: 0, isCritical: true },
    ],
  },
  {
    id: "battery_health",
    title: "Saúde da Bateria",
    description: "Percentual de saúde da bateria conforme indicado pelo sistema.",
    required: true,
    options: [
      { label: "91-100%", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "86-90%", discountFixed: 100, discountPercent: 0, isCritical: false },
      { label: "80-85%", discountFixed: 150, discountPercent: 0, isCritical: false },
      { label: "0-79% (Manutenção)", discountFixed: 0, discountPercent: 5, isCritical: true },
    ],
  },
  {
    id: "front_camera",
    title: "Câmera Frontal Funciona?",
    description: "Verifica se a câmera frontal está funcionando corretamente.",
    required: false,
    options: [
      { label: "Sim", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "Não", discountFixed: 0, discountPercent: 0, isCritical: true },
    ],
  },
  {
    id: "rear_camera",
    title: "Câmera Traseira",
    description: "Avalia o estado e funcionamento das câmeras traseiras.",
    required: false,
    options: [
      { label: "Todas Funcionando", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "Lente Trincada/Quebrada", discountFixed: 150, discountPercent: 0, isCritical: false },
      { label: "Algum Defeito na Câmera", discountFixed: 0, discountPercent: 0, isCritical: true },
    ],
  },
  {
    id: "biometrics",
    title: "Face ID / Biometria",
    description: "Avalia o funcionamento do reconhecimento facial ou biometria digital.",
    required: false,
    options: [
      { label: "Funcionando", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "Não funciona", discountFixed: 0, discountPercent: 0, isCritical: true },
      { label: "Não possui", discountFixed: 0, discountPercent: 0, isCritical: false },
    ],
  },
  {
    id: "speakers",
    title: "Microfones / Som",
    description: "Avalia o funcionamento dos microfones e alto-falantes.",
    required: false,
    options: [
      { label: "Tudo Funcionando", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "Algum Defeito", discountFixed: 0, discountPercent: 0, isCritical: true },
    ],
  },
  {
    id: "buttons",
    title: "Botões e Portas",
    description: "Avalia o funcionamento dos botões físicos e portas de carregamento.",
    required: false,
    options: [
      { label: "Todos funcionando", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "Alguns com defeito", discountFixed: 0, discountPercent: 0, isCritical: true },
    ],
  },
  {
    id: "wear",
    title: "Marcas de Uso",
    description: "Avalia a presença de marcas de uso na carcaça do dispositivo.",
    required: false,
    options: [
      { label: "Sem Marcas", discountFixed: 0, discountPercent: 0, isCritical: false },
      { label: "Poucas Marcas", discountFixed: 0, discountPercent: 5, isCritical: false },
      { label: "Muitas Marcas", discountFixed: 0, discountPercent: 10, isCritical: false },
    ],
  },
  {
    id: "back_cracked",
    title: "Tampa Traseira Trincada/Quebrada",
    description: "Verifica se a tampa traseira está trincada ou quebrada.",
    required: false,
    options: [
      { label: "Sim", discountFixed: 0, discountPercent: 0, isCritical: true },
      { label: "Não", discountFixed: 0, discountPercent: 0, isCritical: false },
    ],
  },
];
