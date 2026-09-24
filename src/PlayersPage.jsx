import { useMemo, useState } from 'react';
import { getDemoState } from './data/demoStore';
import GlobalHeader from './GlobalHeader';
import Footer from './Footer';

const baseUrl = import.meta.env.BASE_URL;
const route = (path) => `${baseUrl}${path.replace(/^\//, '')}`;

const fullName = (player) => `${player.firstName || ''} ${player.surname || ''}`.trim() || 'CLIFT Player';
const initials = (player) => fullName(player).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const isPublicPlayer = (player) => player && player.role !== 'admin' && (!player.visibility || ['public', 'published', 'visible'].includes(String(player.visibility).toLowerCase()));
const featuredAthleteSeeds = [
  { id: 'featured-aarav', firstName: 'Aarav', surname: 'Mehta', sportId: 'Cricket', city: 'Vadodara', position: 'All-rounder', wins: 18, matches: 24, winRate: '75%' },
  { id: 'featured-riya', firstName: 'Riya', surname: 'Desai', sportId: 'Football', city: 'Vadodara', position: 'Midfielder', wins: 15, matches: 21, winRate: '71%' },
  { id: 'featured-kabir', firstName: 'Kabir', surname: 'Joshi', sportId: 'Pickleball', city: 'Vadodara', position: 'Singles', wins: 22, matches: 28, winRate: '79%' },
  { id: 'featured-anaya', firstName: 'Anaya', surname: 'Shah', sportId: 'Tennis', city: 'Vadodara', position: 'Singles', wins: 16, matches: 20, winRate: '80%' },
];

function PlayersPage() {
  const [query, setQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('All');

  const players = useMemo(
    () => getDemoState()
      .players
      .filter(isPublicPlayer)
      .filter((player) => !player.city || player.city.toLowerCase() === 'vadodara')
      .sort((left, right) => fullName(left).localeCompare(fullName(right))),
    []
  );

  const sportOptions = useMemo(
    () => ['All', ...new Set(players.map((player) => player.sportId).filter(Boolean))],
    [players]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const visiblePlayers = useMemo(() => players.filter((player) => {
    const name = fullName(player).toLowerCase();
    const searchable = [
      name,
      String(player.sportId || '').toLowerCase(),
      String(player.city || '').toLowerCase(),
      String(player.state || '').toLowerCase(),
      String(player.team || '').toLowerCase(),
      String(player.position || '').toLowerCase(),
    ];

    const matchesSearch = !normalizedQuery || searchable.some((value) => value.includes(normalizedQuery));
    const matchesSport = sportFilter === 'All' || player.sportId === sportFilter;
    return matchesSearch && matchesSport;
  }), [players, normalizedQuery, sportFilter]);

  const featuredPlayers = useMemo(() => {
    const liveAthletes = players.map((player, index) => ({
      ...player,
      wins: player.wins ?? Math.max(8, 14 - index),
      matches: player.matches ?? Math.max(12, 20 - index),
      winRate: player.winRate ?? `${Math.round((Math.max(8, 14 - index) / Math.max(12, 20 - index)) * 100)}%`,
    }));
    const featured = [...liveAthletes, ...featuredAthleteSeeds];

    const featuredSports = [...new Set([
      ...sportOptions.filter((sport) => sport !== 'All'),
      ...featuredAthleteSeeds.map((player) => player.sportId),
    ])];

    return featuredSports
      .map((sport) => featured.find((player) => player.sportId === sport))
      .filter(Boolean)
      .slice(0, 4);
  }, [players, sportOptions]);

  const groupedPlayers = useMemo(
    () => sportOptions
      .filter((sport) => sport !== 'All')
      .map((sport) => ({
        sport,
        players: visiblePlayers.filter((player) => player.sportId === sport),
      }))
      .filter((group) => group.players.length),
    [sportOptions, visiblePlayers]
  );

  return (
    <div className="page-shell players-page">
      <GlobalHeader />
      <main className="players-main">
        <section className="players-hero">
          <div className="container players-hero-inner">
            <div className="players-hero-copy">
              <span className="eyebrow">PLAYER COMMUNITY</span>
              <h1>Find players. Join the match.</h1>
              <p>
                Explore the Vadodara sports community, discover standout athletes and connect with players who are ready to compete at every level.
              </p>

              <div className="hero-actions">
                <a className="btn btn-primary" href={route('/player/register')}>Register as a Player</a>
                <a className="btn btn-secondary" href={route('/tournaments')}>View Tournaments</a>
              </div>

              <div className="players-stats-row" aria-label="Players community stats">
                <div className="players-stat-box">
                  <strong>{visiblePlayers.length}</strong>
                  <span>Players</span>
                </div>
                <div className="players-stat-box">
                  <strong>18+</strong>
                  <span>Events</span>
                </div>
                <div className="players-stat-box">
                  <strong>6</strong>
                  <span>Sports</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        <section className="players-directory">
          <div className="container">
            <div className="players-directory-header">
              <div>
                <span className="section-kicker">Search players</span>
                <h2>{visiblePlayers.length} athletes</h2>
              </div>
              <span className="players-directory-result">{visiblePlayers.length ? 'Community players' : 'No results'}</span>
            </div>

            <div className="players-filters">
              <label className="players-search">
                <span aria-hidden="true">⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search player name..."
                  aria-label="Search player names"
                />
              </label>

              <label className="players-select-wrap">
                <span>Sport</span>
                <select value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
                  {sportOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'All' ? 'All sports' : option.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              {(query || sportFilter !== 'All') && (
                <button
                  type="button"
                  className="players-reset"
                  onClick={() => {
                    setQuery('');
                    setSportFilter('All');
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {featuredPlayers.length > 0 && (
              <div className="featured-players-wrap">
                <div className="section-row featured-section-heading">
                  <div>
                    <span className="section-kicker">Featured athletes</span>
                    <h3>Standout players in every game</h3>
                  </div>
                  <p>Top performers from the CLIFT community.</p>
                </div>
                <div className="featured-players-grid">
                  {featuredPlayers.map((player) => (
                    <FeaturedPlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </div>
            )}

            {groupedPlayers.length ? (
              <div className="player-groups" id="directory">
                {groupedPlayers.map((group) => (
                  <section className="player-group" key={group.sport}>
                    <div className="player-group-header">
                      <div>
                        <span className="section-kicker">Game directory</span>
                        <h3>{group.sport.toUpperCase()}</h3>
                      </div>
                      <button type="button" className="inline-link" onClick={() => setSportFilter(group.sport)}>
                        View all {group.sport} players →
                      </button>
                    </div>

                    <div className="players-grid">
                      {group.players.slice(0, 4).map((player) => (
                        <PlayerCard key={player.id} player={player} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="players-empty">
                <span className="section-kicker">No players found</span>
                <h3>No players match this search.</h3>
                <p>Try another sport or search term to explore the player community.</p>
                <a className="btn btn-primary" href={route('/player/register')}>Register as a Player</a>
              </div>
            )}
          </div>
        </section>

        <section className="player-directory-cta">
          <div className="container player-directory-cta-inner">
            <div>
              <span className="section-kicker">Ready to play?</span>
              <h3>Create your player profile.</h3>
              <p>Get discovered by teams, communities and sports venues across CLIFT.</p>
            </div>
            <a className="btn btn-primary" href={route('/player/register')}>Become a player</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function PlayerCard({ player }) {
  const name = fullName(player);

  return (
    <article className="player-directory-card">
      <div className="player-avatar">
        {player.profileImage ? (
          <img src={player.profileImage} alt={`${name} profile`} loading="lazy" />
        ) : (
          <span>{initials(player)}</span>
        )}
      </div>

      <div className="player-card-content">
        <span className="player-sport-chip">{player.sportId || 'Sports player'}</span>
        <h4>{name}</h4>
        <p>{player.city || 'Vadodara'}{player.state ? `, ${player.state}` : ', Gujarat'}</p>
        {player.position ? <p className="player-meta">{player.position}</p> : null}
        <a className="link-button" href={route('/player/profile')}>View profile</a>
      </div>
    </article>
  );
}

function FeaturedPlayerCard({ player }) {
  const name = fullName(player);

  return (
    <article className="featured-player-card">
      <div className="featured-player-image">
        {player.profileImage ? (
          <img src={player.profileImage} alt={`${name} profile`} loading="lazy" />
        ) : (
          <span>{initials(player)}</span>
        )}
      </div>

      <div className="featured-player-body">
        <span className="player-sport-chip">{player.sportId || 'Sports player'}</span>
        <h4>{name}</h4>
        <p>{player.city || 'Vadodara'}{player.state ? `, ${player.state}` : ', Gujarat'}</p>
        {player.position ? <p className="player-meta">{player.position}</p> : null}
        <a className="link-button" href={route('/player/profile')}>View profile</a>
        <div className="featured-player-stats" aria-label={`${name} performance statistics`}>
          <span><strong>{player.wins}</strong>Wins</span>
          <span><strong>{player.matches}</strong>Matches</span>
          <span><strong>{player.winRate}</strong>Win rate</span>
        </div>
      </div>
    </article>
  );
}

export default PlayersPage;
