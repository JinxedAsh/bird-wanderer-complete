import { InformationDisclosure } from './InformationDisclosure';
import React, { useState } from 'react';
import { AppNotification, ScreenType } from '../types';
import type { AlertSubscription } from '../lib/alerts';

interface NotificationsScreenProps {
  opportunitiesEnabled?:boolean;
  onToggleOpportunities?:()=>void;
  pushConfigured?:boolean;
  deviceRegistered?:boolean;
  pushBusy?:boolean;
  onTogglePush?:()=>void;
  enabled?:boolean;
  onToggleEnabled?:()=>void;
  subscriptions?:AlertSubscription[];
  onRemoveSubscription?:(kind:AlertSubscription['kind'],id:string)=>void;
  error?:string;
  onRetry?:()=>void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onSelectNotification: (notif: AppNotification) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  opportunitiesEnabled=false,onToggleOpportunities,
  pushConfigured=false,deviceRegistered=false,pushBusy=false,onTogglePush,
  enabled=false,onToggleEnabled,subscriptions=[],onRemoveSubscription,error,onRetry,
  notifications,
  onMarkAllRead,
  onSelectNotification,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'alerts' | 'followers'>('all');

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    return n.category === activeTab;
  });

  return (
    <div className="flex flex-col w-full pb-28 pt-1">
      {/* Content Header & Action Bar */}
      <section className="px-4 pt-2 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-bold text-[#181c20]">Notifications</span>
          <span
            className={`font-semibold text-[11px] px-2 py-0.5 rounded-full ${
              unreadCount > 0
                ? 'bg-[#2d5a27] text-white'
                : 'bg-[#ebeef3] text-[#42493e]'
            }`}
          >
            {unreadCount > 0 ? `${unreadCount} new` : '0 new'}
          </span>
          <InformationDisclosure className="reference-info-inline" label="Alert settings and subscriptions">
        <label className="flex min-h-11 items-center justify-between gap-2 font-semibold">Sighting alerts enabled<input type="checkbox" aria-label="Sighting alerts enabled" checked={enabled} onChange={onToggleEnabled} className="h-6 w-6" /></label>
        <p>Tap the bell on a bird or hotspot page to hear when someone posts a new sighting. A posted sighting is not guaranteed to still be there.</p>
        <p className="mt-2">{pushConfigured ? deviceRegistered ? 'Phone notifications are on for this device.' : 'Alerts show here in the app. Turn on phone notifications to get them when the app is closed.' : 'Alerts show here in the app.'}</p>
        <label className="mt-2 flex min-h-11 items-center justify-between gap-2 font-semibold">Photography forecast alerts<input type="checkbox" aria-label="Photography forecast alerts" checked={opportunitiesEnabled} onChange={onToggleOpportunities} className="h-6 w-6" /></label>
        <p>For hotspots you follow, get a heads-up when the forecast is dry and calm around sunrise or sunset (rain chance up to 20%, wind up to 15 km/h). At most one per hotspot each day. Sighting alerts must be on.</p>
        {pushConfigured&&<button type="button" disabled={pushBusy} onClick={onTogglePush} className="mt-2 min-h-11 rounded-lg bg-[#2d5a27] px-3 text-white">{pushBusy?'Updating…':deviceRegistered?'Turn off phone notifications':'Turn on phone notifications'}</button>}
        <details className="mt-2"><summary className="min-h-11 cursor-pointer">Manage subscriptions ({subscriptions.length})</summary>
          {subscriptions.length===0&&<p>You are not following any birds or hotspots yet.</p>}
          {subscriptions.map(row=><div key={`${row.kind}:${row.id}`} className="flex items-center justify-between gap-2"><span className="min-w-0 break-words">{row.label} · {row.kind}</span><button type="button" onClick={()=>onRemoveSubscription?.(row.kind,row.id)} className="min-h-11 shrink-0 px-2 underline" aria-label={`Remove ${row.label} subscription`}>Remove</button></div>)}
        </details>

      </InformationDisclosure>
        </div>

        <button
          onClick={onMarkAllRead}
          className="min-h-11 text-[13px] font-semibold text-[#154212] hover:text-[#2d5a27] transition-colors py-1 px-1 focus:outline-none"
        >
          Mark all read
        </button>
      </section>


      {error&&<div role="alert" className="mt-2"><p>{error}</p><button type="button" onClick={onRetry} className="min-h-11 underline">Retry alerts</button></div>}

      {/* Filter Tabs */}
      <nav aria-label="Notification filters" className="px-4 pb-3">
        <div className="flex items-center gap-1.5 bg-[#f1f4f9] px-1 py-2 rounded-xl overflow-x-auto">
          {(['all', 'mentions', 'alerts', 'followers'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`reference-filter h-7 flex-1 shrink-0 px-2 rounded-lg text-[13px] text-center capitalize transition-all ${
                  isActive
                    ? 'bg-white text-[#154212] font-bold shadow-xs'
                    : 'text-[#42493e] hover:text-[#181c20]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Notification Feed */}
      <div className="flex flex-col px-4 gap-2.5">
        {filteredNotifications.map((notif) => (
          <article
            key={notif.id}
            role="button"
            tabIndex={0}
            onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelectNotification(notif);}}}
            onClick={() => onSelectNotification(notif)}
            className={`relative flex items-start gap-3 p-3.5 rounded-lg shadow-xs transition-all cursor-pointer border ${
              notif.isUnread
                ? 'bg-white border-[#f1f4f9]'
                : 'bg-white/60 hover:bg-white border-transparent'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5 relative">
              <div
                className={`w-10 h-10 rounded-xl ${notif.iconBg} flex items-center justify-center ${notif.iconColor}`}
              >
                <span className="material-symbols-outlined text-[20px]">{notif.icon}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <h2 className="text-[14px] font-medium text-[#181c20] truncate leading-snug">{notif.title}</h2>
                <time title={notif.timeAgo} aria-label={notif.timeAgo} className="text-[11px] text-[#72796e] flex-shrink-0">{notif.timeAgo.split(',')[0]}</time>
              </div>

              <p className="text-[14px] text-[#42493e] break-words leading-normal">
                {notif.description}
              </p>
            </div>

            {notif.thumbnail && (
              <div className="flex-shrink-0 relative">
                <img
                  src={notif.thumbnail}
                  alt="Thumb"
                  className="w-11 h-11 rounded-lg object-cover bg-[#ebeef3]"
                />
              </div>
            )}

            {notif.isUnread && (
              <div className="absolute right-3.5 top-5 w-2 h-2 rounded-full bg-[#fe932c]"></div>
            )}
          </article>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="py-14 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#f1f4f9] flex items-center justify-center text-[#72796e] mb-3">
              <span className="material-symbols-outlined text-[28px]">notifications_paused</span>
            </div>
            <p className="text-[16px] font-bold text-[#181c20] mb-1">All quiet in the field</p>
            <p className="text-[12px] text-[#42493e] max-w-xs">
              No pending notifications in this category. Keep exploring and observing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
