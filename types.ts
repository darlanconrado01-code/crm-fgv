
export type NavigationPage = 'atendimento' | 'dashboard' | 'contatos' | 'relatorios' | 'configuracoes' | 'agendamento' | 'tarefas' | 'agenda' | 'usuarios' | 'campos_personalizados' | 'setores' | 'tags' | 'bots' | 'documentacao' | 'auditoria' | 'perfil';

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
  isGroup?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
}

export type CustomFieldType = 'string' | 'boolean' | 'text' | 'number' | 'select';

export interface CustomField {
  id: string;
  label: string;
  scope: 'contact' | 'company';
  chatType: 'private' | 'group' | 'both';
  type: CustomFieldType;
  placeholder?: string;
  required: boolean;
  active: boolean;
  options?: string[];
  updatedAt: any;
}
