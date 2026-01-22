
import React from 'react';
import { User, Eye, User2, MessageCircle } from 'lucide-react';
import { ChatContact } from '../types';

interface ChatListItemProps {
  chat: ChatContact;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat }) => {
  return (
    <div className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex gap-4 relative group">
      {/* Avatar Container */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
          <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" />
        </div>
        {chat.unreadCount && (
          <div className="absolute -top-1 -left-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
            {chat.unreadCount}
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-gray-800 text-sm truncate">{chat.name}</h3>
          <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
             <span className="w-3 h-3 border border-gray-300 rounded-full flex items-center justify-center text-[8px] font-bold">L</span>
             {chat.time}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-gray-500">
           <Eye size={12} className="shrink-0" />
           <p className="text-xs truncate italic">{chat.lastMessage}</p>
        </div>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {chat.tags.map((tag, idx) => {
            const isSector = tag.includes('Comercial');
            const isBadge = tag.startsWith('+');
            let colorClass = "bg-blue-600 text-white";
            if (tag === 'Nacional') colorClass = "bg-emerald-600 text-white";
            if (tag === 'São Luís') colorClass = "bg-sky-500 text-white";
            if (tag === 'Campanha Forms') colorClass = "bg-lime-400 text-gray-800";
            if (isSector) colorClass = "bg-blue-600 text-white";
            if (isBadge) colorClass = "bg-gray-100 text-gray-500 border border-gray-200";

            return (
              <span key={idx} className={`${colorClass} text-[9px] font-bold px-1.5 py-0.5 rounded`}>
                {tag}
              </span>
            );
          })}
        </div>
      </div>

      {/* Agent Info */}
      <div className="shrink-0 text-right self-end pb-1">
        <div className="flex flex-col items-end gap-0.5">
           <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <User2 size={10} />
              {chat.agent}
           </div>
           <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <div className="w-3 h-3 bg-emerald-100 rounded-full flex items-center justify-center">
                 <MessageCircle size={8} fill="currentColor" />
              </div>
              {chat.sector}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;
