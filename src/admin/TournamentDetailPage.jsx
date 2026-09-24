import { useMemo, useState } from 'react';
import AdminIcon from './AdminIcon';
import { route } from '../config/routes';
import AdminRegistrationsPage from './AdminRegistrationsPage';
import { StatusPill } from './AdminUI';
import { getAllTournaments } from '../data/dashboardSelectors';
import MatchesPage from './MatchesPage';
import { getTournamentBracket } from '../data/matchStore';

const tabs = ['Overview', 'Registrations', 'Teams', 'Matches', 'Results', 'Bracket', 'Settings'];
const navigate = (href) => { window.location.href = route(href); };

export default function TournamentDetailPage({ tournamentId }) {
  const [tab, setTab] = useState('Overview');
  const tournament = useMemo(() => getAllTournaments().find((item) => item.id === tournamentId), [tournamentId]);
  if (!tournament) return <div className="admin-empty"><strong>Tournament not found</strong><p>This tournament may have been removed or is not available.</p><button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/tournaments')}>Back to tournaments</button></div>;

  return <div className="admin-list-page tournament-management-page">
    <button type="button" className="admin-back-link" onClick={() => navigate('/admin/tournaments')}><AdminIcon name="chevron" size={14} /> All tournaments</button>
    <section className="tournament-admin-banner" style={{ backgroundImage: `linear-gradient(90deg, rgba(5, 12, 10, 0.96), rgba(5, 12, 10, 0.55)), url('${tournament.image || ''}')` }}><div><span className="section-kicker">{tournament.sport} TOURNAMENT</span><h2>{tournament.name}</h2><p>{tournament.venueName || tournament.area} · {tournament.dateLabel || tournament.date}</p></div><StatusPill status={tournament.status} /></section>
    <div className="tournament-admin-stats"><Mini label="Sport" value={tournament.sport} /><Mini label="Venue" value={tournament.venueName || tournament.area} /><Mini label="Teams" value={`${tournament.registeredTeams || 0} / ${tournament.teamCapacity || tournament.maxTeams || '—'}`} /><Mini label="Registration" value={tournament.status === 'Published' ? 'Open' : tournament.status} /><Mini label="Prize pool" value={tournament.prizePool || '—'} /><Mini label="Entry fee" value={tournament.entryFee || '—'} /></div>
    <nav className="admin-section-tabs tournament-admin-tabs" aria-label="Tournament sections">{tabs.map((item) => <button type="button" key={item} className={`admin-section-tab ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === 'Registrations' ? <AdminRegistrationsPage tournamentId={tournament.id} /> : tab === 'Matches' || tab === 'Results' ? <MatchesPage tournamentId={tournament.id} /> : tab === 'Bracket' ? <Bracket tournament={tournament} /> : <Overview tournament={tournament} tab={tab} />}
  </div>;
}

function Mini({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function Overview({ tournament, tab }) {
  if (tab !== 'Overview') return <section className="admin-placeholder"><span className="admin-placeholder-icon"><AdminIcon name={tab === 'Teams' ? 'shield' : tab === 'Bracket' ? 'vs' : 'cog'} size={22} /></span><h3>{tab} workspace</h3><p>This tournament section is ready for competition operations in the next workflow.</p></section>;
  return <div className="tournament-overview-grid"><section className="admin-detail-section"><h4>Description</h4><p className="admin-detail-text">{tournament.description || 'No description has been added yet.'}</p><h4>Rules</h4><p className="admin-detail-text">{tournament.rules || 'Rules will be published by the organizer.'}</p><h4>Eligibility</h4><p className="admin-detail-text">{tournament.eligibilityRules || `${tournament.gender || 'Open'} participation · ${tournament.skillLevel || 'All skill levels'}`}</p></section><aside className="tournament-overview-aside"><Info title="Prize details" value={`${tournament.prizePool || '—'}${tournament.firstPrize ? ` · Winner ${tournament.firstPrize}` : ''}`} /><Info title="Venue details" value={`${tournament.venueName || tournament.area}${tournament.area ? ` · ${tournament.area}` : ''}`} /><Info title="Organizer" value={tournament.organizerName || 'Platform Admin'} /><Info title="Registration information" value={`${tournament.registrationType || 'Team'} registration${tournament.registrationEnd ? ` closes ${tournament.registrationEnd}` : ''}`} /></aside></div>;
}

function Info({ title, value }) { return <div className="tournament-info-block"><span>{title}</span><strong>{value}</strong></div>; }

function Bracket({ tournament }) {
  const rounds = getTournamentBracket(tournament);
  const result = tournament.finalResult ? { winner: tournament.winner, finalResult: tournament.finalResult } : null;
  return <section className="admin-detail-section"><h4>Bracket</h4><div className="bracket-scroll"><div className="bracket-board">{rounds.map((round) => <div className="bracket-round" key={round.name}><h3>{round.name}</h3>{round.games.map((game, index) => <div className="bracket-game" key={`${round.name}-${index}`}><span>{game.teams[0] || 'TBD'}{game.result?.teamAScore ? ` · ${game.result.teamAScore}` : ''}</span><span>{game.teams[1] || 'TBD'}{game.result?.teamBScore ? ` · ${game.result.teamBScore}` : ''}</span></div>)}</div>)}<div className="bracket-round champion-round"><h3>Champion</h3><div className="bracket-game"><span>{result?.winner || 'Final winner'}</span></div></div></div></div></section>;
}