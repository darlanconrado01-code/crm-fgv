
export type NavigationPage = 'atendimento' | 'dashboard' | 'contatos' | 'relatorios' | 'configuracoes' | 'agendamento' | 'tarefas' | 'bots' | 'usuarios' | 'campos_personalizados' | 'setores' | 'tags';

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
  status: 'atendimento' | 'aguardando' | 'bot' | 'resolvido' | 'pausado';
  remoteJid?: string;
}

export type CustomFieldType = 'string' | 'boolean' | 'text' | 'number' | 'select';

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  required: boolean;
  active: boolean;
  options?: string[];
  updatedAt: any;
}
