import { useMemo, useState } from 'react';
import AdminIcon from './AdminIcon';
import { ACTIVITY_ICONS, getNotifications, markAllNotificationsRead, markNotificationRead } from '../data/activityStore';
import { timeAgo } from '../data/dashboardSelectors';

const notificationLabels = {
  'player-registered': 'New player registered',
  'turf-added': 'New turf added',
  'turf-created': 'New turf added',
  'registration-created': 'New tournament registration',
  'registration-approved': 'Registration approved',
  'tournament-published': 'Tournament published',
  'tournament-cancelled': 'Tournament cancelled',
  'match-result-updated': 'Match result updated',
};

export default function NotificationsPage() {
  const [refresh, setRefresh] = useState(0);
  const notifications = useMemo(() => getNotifications(), [refresh]);
  const unread = notifications.filter((item) => !item.read).length;
  const refreshList = () => setRefresh((value) => value + 1);
  const markRead = (notification) => { if (!notification.read) markNotificationRead(notification.id); refreshList(); };
  const markAll = () => { markAllNotificationsRead(); refreshList(); };
  return <div className="admin-list-page"><div className="admin-dash-head"><div><span className="section-kicker">NOTIFICATIONS</span><h2>Platform inbox</h2><p>{unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'You are all caught up.'}</p></div>{unread > 0 && <button type="button" className="btn btn-secondary admin-action-btn" onClick={markAll}><AdminIcon name="check" size={16} /> Mark all as read</button>}</div>
    {notifications.length ? <section className="admin-panel notification-list">{notifications.map((notification) => <article className={`notification-item ${notification.read ? '' : 'is-unread'}`} key={notification.id} onClick={() => { markRead(notification); if (notification.targetPath) window.location.href = notification.targetPath; }}><span className="notification-icon"><AdminIcon name={ACTIVITY_ICONS[notification.type] || 'bell'} size={17} /></span><div className="notification-copy"><strong>{notificationLabels[notification.type] || notification.message}</strong><p>{notification.message}</p><small>{notification.actorName} · {timeAgo(notification.createdAt)}</small></div><div className="notification-actions">{!notification.read && <button type="button" className="admin-link-btn" onClick={(event) => { event.stopPropagation(); markRead(notification); }}>Mark as read</button>}<span className={`notification-dot ${notification.read ? 'read' : ''}`} aria-label={notification.read ? 'Read' : 'Unread'} /></div></article>)}</section> : <div className="admin-empty"><span className="admin-empty-icon"><AdminIcon name="bell" size={20} /></span><strong>No notifications yet</strong><p>New platform events will appear here as users and administrators take action.</p></div>}
  </div>;
}