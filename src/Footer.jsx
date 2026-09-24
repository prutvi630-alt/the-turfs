const baseUrl = import.meta.env.BASE_URL;
const route = (path) => `${baseUrl}${path.replace(/^\//, '')}`;

const platformLinks = [
  { label: 'Home', href: route('/') },
  { label: 'Tournaments', href: route('/tournaments') },
  { label: 'Turfs', href: route('/book-your-turf') },
  { label: 'Players', href: route('/players') },
  { label: 'About', href: route('/about') },
];

const joinLinks = [
  { label: 'Find a Tournament', href: route('/tournaments') },
  { label: 'Register as Player', href: route('/player/register') },
  { label: 'Register Your Turf', href: route('/turf-owner/register') },
];

const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/' },
  { label: 'Facebook', href: 'https://www.facebook.com/' },
  { label: 'YouTube', href: 'https://www.youtube.com/' },
];

function SocialIcon({ type }) {
  const paths = {
    instagram: (
      <>
        <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.2" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
      </>
    ),
    facebook: (
      <path
        fill="currentColor"
        stroke="none"
        d="M13.6 21v-7.4h2.5l.4-2.9h-2.9V8.9c0-.84.23-1.41 1.44-1.41h1.54V4.9c-.27-.04-1.18-.11-2.24-.11-2.22 0-3.74 1.35-3.74 3.84v2.14H8.1v2.9h2.51V21h2.99Z"
      />
    ),
    youtube: (
      <>
        <rect x="2.4" y="5.2" width="19.2" height="13.6" rx="4" />
        <path fill="currentColor" stroke="none" d="M10.2 9.1l4.7 2.9-4.7 2.9V9.1Z" />
      </>
    ),
  };

  return (
    <svg className="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <a className="footer-wordmark" href={route('/')} aria-label="CLIFT home">CLIFT</a>
          <p>Building a connected sports community for Vadodara, one game, one venue and one tournament at a time.</p>
          <div className="socials" aria-label="Social links">
            {socialLinks.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} title={social.label}>
                <SocialIcon type={social.label.toLowerCase()} />
              </a>
            ))}
          </div>
        </div>

        <FooterColumn title="PLATFORM" links={platformLinks} />

        <FooterColumn title="JOIN" links={joinLinks} />

        <div className="footer-column">
          <h4>ABOUT</h4>
          <ul>
            <li><a href={route('/about')}>Our Story</a></li>
            <li><a href={route('/#sports')}>Explore Sports</a></li>
            <li><a href={route('/tournaments')}>Tournaments</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span className="footer-copyright">© 2026 All Rights Reserved</span>
          <span className="footer-credit">Design and Developed by The Codex - Born To Build</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return <div className="footer-column"><h4>{title}</h4><ul>{links.map((link) => <li key={link.label}><a href={link.href}>{link.label}</a></li>)}</ul></div>;
}

export default Footer;
