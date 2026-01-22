
export type NavigationPage = 'atendimento' | 'dashboard' | 'contatos' | 'relatorios' | 'configuracoes' | 'agendamento' | 'tarefas' | 'bots';

export interface ChatContact {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  agent: string;
  sector: string;
  tags: string[];
  avatarUrl: string;
  unreadCount?: number;
}
