import { useMemo, useState } from 'react';
import { sports } from './data/homeData';
import { getAllTurfs, getBookings, getDemoState, getSession, getTurfOwnerId, saveBookings } from './data/demoStore';
import GlobalHeader from './GlobalHeader';
import Footer from './Footer';
import scannerImage from './data/scanner.jpeg';

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not selected';
const overlaps = (fromTime, toTime, slotFrom, slotTo) => fromTime < slotTo && toTime > slotFrom;
const fallbackTurfImage = sports.find((sport) => sport.id === 'cricket')?.image || '';
const route = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const normalizeTurf = (turf = {}) => ({
  ...turf,
  id: turf.id,
  name: turf.name || turf.turfName,
  image: turf.image || turf.images?.[0] || turf.primaryImage || fallbackTurfImage,
  area: turf.area || turf.turfAddress?.area || turf.location || 'Vadodara',
  city: turf.city || turf.turfAddress?.city || 'Vadodara',
  sports: Array.isArray(turf.sports) && turf.sports.length ? turf.sports : (Array.isArray(turf.games) ? turf.games : [turf.sport || 'Cricket']),
});

const getSelectedTurf = () => {
  const path = window.location.pathname.replace(/^\/The-Turf-/, '');
  const turfId = path.split('/').filter(Boolean)[1];
  return getAllTurfs().find((turf) => turf.id === turfId) || null;
};

const isPublicTurf = (turf) => {
  const status = String(turf.registrationStatus || '').toLowerCase();
  return !status || ['registered', 'approved', 'published', 'active'].includes(status);
};

function BookingPage() {
  const allTurfs = getAllTurfs().map(normalizeTurf);
  const selectedTurf = getSelectedTurf();
  const [query, setQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('All Sports');
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const vadodaraTurfs = allTurfs.filter((turf) => String(turf.city || '').trim().toLowerCase() === 'vadodara' && isPublicTurf(turf));
  const sportOptions = useMemo(() => ['All Sports', ...new Set(vadodaraTurfs.flatMap((turf) => turf.sports))], [vadodaraTurfs]);
  const areaOptions = useMemo(() => ['All Areas', ...new Set(vadodaraTurfs.map((turf) => turf.area).filter(Boolean))], [vadodaraTurfs]);
  const visibleTurfs = vadodaraTurfs.filter((turf) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || [turf.name, turf.area, turf.city, ...(turf.sports || [])].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    const matchesSport = sportFilter === 'All Sports' || turf.sports.includes(sportFilter);
    const matchesArea = areaFilter === 'All Areas' || turf.area === areaFilter;
    return matchesQuery && matchesSport && matchesArea;
  });
  const resetFilters = () => {
    setQuery('');
    setSportFilter('All Sports');
    setAreaFilter('All Areas');
  };

  if (selectedTurf) return <TurfBookingFlow turf={normalizeTurf(selectedTurf)} />;

  return (
    <div className="page-shell booking-page">
      <GlobalHeader />
      <main>
        <section className="turf-directory-hero">
          <div className="container turf-directory-hero-content">
            <span className="eyebrow">FIND YOUR TURF</span>
            <h1>PLAY AT THE BEST TURFS IN VADODARA.</h1>
            <p>Discover sports turfs, compare venues and find the right place for your next game.</p>
          </div>
        </section>

        <section className="turf-directory container section-spacing">
          <div className="turf-directory-heading">
            <div>
              <span className="section-kicker">VADODARA SPORTS VENUES</span>
              <h2>{visibleTurfs.length} TURFS IN VADODARA</h2>
            </div>
            <span className="turf-directory-result">{visibleTurfs.length ? 'READY TO BOOK' : 'NO RESULTS'}</span>
          </div>

          <div className="turf-directory-filters">
            <label className="turf-directory-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search turfs, areas or sports..." aria-label="Search turfs, areas or sports" /></label>
            <label><span>Sport</span><select value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>{sportOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>Area</span><select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>{areaOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            {(query || sportFilter !== 'All Sports' || areaFilter !== 'All Areas') && <button type="button" className="turf-directory-reset" onClick={resetFilters}>Reset</button>}
          </div>

          {visibleTurfs.length ? <div className="turfs-grid turf-directory-grid">
            {visibleTurfs.map((turf) => <TurfDirectoryCard key={turf.id} turf={turf} />)}
          </div> : <div className="turf-directory-empty"><span className="section-kicker">NO TURFS FOUND</span><h2>NO TURFS AVAILABLE YET.</h2><p>Try another search or area, or register your venue with CLIFT.</p><button type="button" className="btn btn-primary" onClick={() => { window.location.href = route('/turf-owner/register'); }}>Register Your Turf</button></div>}
        </section>

        <section className="turf-owner-cta">
          <div className="container turf-owner-cta-inner"><div><span className="section-kicker">FOR TURF OWNERS</span><h2>OWN A TURF?</h2><p>List your sports venue on CLIFT and connect with players.</p></div><a className="btn btn-primary" href={route('/turf-owner/register')}>Register Your Turf</a></div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function TurfDirectoryCard({ turf }) {
  const bookingRoute = route(`/book-your-turf/${turf.id}`);
  return <article className="turf-directory-card">
    <div className="turf-image-wrap"><img src={turf.image} alt={`${turf.name} sports turf`} loading="lazy" /><span className="area-badge">{turf.area}</span><div className="sport-badges">{turf.sports.map((sport) => <span key={sport}>{sport}</span>)}</div></div>
    <div className="turf-card-body"><h2>{turf.name}</h2><p className="turf-location">{turf.address || `${turf.area}, ${turf.city}`}</p><div className="meta-line"><span>Area Zone:</span><strong>{turf.area}</strong></div><div className="meta-line"><span>Sports:</span><strong>{turf.sports.join(' • ')}</strong></div>{turf.facilities?.length ? <div className="meta-line"><span>Facilities:</span><strong>{turf.facilities.join(' • ')}</strong></div> : null}{turf.openingHours ? <div className="meta-line"><span>Opening:</span><strong>{turf.openingHours}</strong></div> : null}{turf.price ? <div className="meta-line price-row"><span>Starting price:</span><strong>{turf.price}</strong></div> : null}<a className="btn btn-primary turf-directory-book" href={bookingRoute}>Book This Turf</a></div>
  </article>;
}

function TurfBookingFlow({ turf }) {
  const [stage, setStage] = useState('form');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [errors, setErrors] = useState({});
  const sports = Array.isArray(turf.sports) ? turf.sports : [turf.sport || 'Cricket'];
  const [booking, setBooking] = useState({ name: '', mobile: '', email: '', game: sports[0] || '', date: '', fromTime: '', toTime: '' });
  const update = (field, value) => setBooking((current) => ({ ...current, [field]: value }));
  const demoState = getDemoState();
  const unavailableSlots = [
    ...(demoState.availability || []).filter((slot) => slot.turfId === turf.id && slot.sport === booking.game && slot.date === booking.date),
    ...getBookings().filter((item) => item.turfId === turf.id && item.game === booking.game && item.bookingDate === booking.date && item.bookingStatus === 'Confirmed').map((item) => ({ fromTime: item.fromTime, toTime: item.toTime, reason: 'Confirmed booking' })),
  ];

  const validate = () => {
    const next = {};
    if (!booking.name.trim()) next.name = 'Full name is required.';
    if (!/^\+?[0-9\s-]{10,15}$/.test(booking.mobile.trim())) next.mobile = 'Enter a valid mobile number.';
    if (!/^\S+@\S+\.\S+$/.test(booking.email.trim())) next.email = 'Enter a valid email address.';
    if (!booking.game) next.game = 'Select a game.';
    if (!booking.date || Number.isNaN(new Date(`${booking.date}T00:00:00`).getTime())) next.date = 'Select a valid booking date.';
    if (!booking.fromTime) next.fromTime = 'Select a start time.';
    if (!booking.toTime) next.toTime = 'Select an end time.';
    if (booking.fromTime && booking.toTime && booking.toTime <= booking.fromTime) next.toTime = 'End time must be after start time.';
    if (booking.fromTime && booking.toTime && unavailableSlots.some((slot) => overlaps(booking.fromTime, booking.toTime, slot.fromTime, slot.toTime))) next.fromTime = 'This time overlaps an unavailable slot.';
    if (!paymentMethod) next.paymentMethod = 'Select a payment method.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const confirmBooking = (paymentStatus) => {
    const session = getSession();
    const savedBooking = { bookingId: `booking-${Date.now()}`, turfId: turf.id, ownerId: turf.ownerId || getTurfOwnerId(turf.id), userId: session?.role === 'player' ? session.userId : null, turfName: turf.name, userName: booking.name.trim(), mobile: booking.mobile.trim(), email: booking.email.trim(), game: booking.game, bookingDate: booking.date, fromTime: booking.fromTime, toTime: booking.toTime, paymentMethod: paymentMethod === 'online' ? 'Online' : 'Cash', bookingStatus: 'pending', paymentStatus, amount: turf.price, createdAt: new Date().toISOString() };
    saveBookings([...getBookings(), savedBooking]);
    setBooking((current) => ({ ...current, ...savedBooking }));
    setStage('success');
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    if (paymentMethod === 'online') setStage('payment');
    else confirmBooking('Pending - pay at turf');
  };

  return <div className="page-shell booking-flow-page"><GlobalHeader /><main className="container section-spacing">
    {stage === 'form' && <BookingForm turf={turf} sports={sports} booking={booking} errors={errors} paymentMethod={paymentMethod} unavailableSlots={unavailableSlots} update={update} setPaymentMethod={setPaymentMethod} onSubmit={submit} />}
    {stage === 'payment' && <PaymentScreen turf={turf} booking={booking} onConfirm={() => confirmBooking('Paid - demo payment')} onBack={() => setStage('form')} />}
    {stage === 'success' && <BookingSuccess turf={turf} booking={booking} />}
  </main><Footer /></div>;
}

function BookingForm({ turf, sports, booking, errors, paymentMethod, unavailableSlots, update, setPaymentMethod, onSubmit }) {
  return <><div className="section-heading booking-flow-heading"><span className="section-kicker">RESERVE YOUR TURF</span><h1>BOOK {turf.name.toUpperCase()}.</h1><p>{turf.area}, Vadodara · {turf.openingHours} · {turf.price}</p></div><div className="booking-layout">
    <section className="booking-venue-card"><img src={turf.image} alt={turf.name} /><div><span className="section-kicker">SELECTED TURF</span><h2>{turf.name}</h2><p>{turf.area || turf.location || 'Vadodara'}, Vadodara</p><strong>Available: {(turf.sports || []).join(' · ')}</strong></div></section>
    <form className="booking-form" onSubmit={onSubmit}><section className="form-section"><div className="form-section-title"><span>01</span><h2>Your information</h2></div><div className="form-grid two"><BookingField label="Full Name" value={booking.name} onChange={(value) => update('name', value)} error={errors.name} placeholder="Enter your full name" /><BookingField label="Mobile Number" value={booking.mobile} onChange={(value) => update('mobile', value)} error={errors.mobile} placeholder="98765 43210" /><BookingField label="Email Address" type="email" value={booking.email} onChange={(value) => update('email', value)} error={errors.email} placeholder="you@example.com" /></div></section>
    <section className="form-section"><div className="form-section-title"><span>02</span><h2>Booking details</h2></div><div className="form-grid two"><BookingSelect label="Game / Sport" value={booking.game} onChange={(value) => update('game', value)} options={sports} error={errors.game} /><BookingField label="Booking Date" type="date" value={booking.date} onChange={(value) => update('date', value)} error={errors.date} min={new Date().toISOString().slice(0, 10)} /><BookingField label="From Time" type="time" value={booking.fromTime} onChange={(value) => update('fromTime', value)} error={errors.fromTime} /><BookingField label="To Time" type="time" value={booking.toTime} onChange={(value) => update('toTime', value)} error={errors.toTime} /></div>{booking.date && <div className="availability-note"><strong>{unavailableSlots.length ? 'Unavailable for this game and date' : 'No blocked slots for this game and date'}</strong>{unavailableSlots.length > 0 && <span>{unavailableSlots.map((slot) => `${slot.fromTime}–${slot.toTime} (${slot.reason || 'Unavailable'})`).join(' · ')}</span>}</div>}</section>
    <section className="form-section"><div className="form-section-title"><span>03</span><h2>Payment method</h2></div><div className="payment-options"><button type="button" className={`payment-option ${paymentMethod === 'online' ? 'selected' : ''}`} onClick={() => setPaymentMethod('online')}><strong>Online Payment</strong><span>Pay securely in this demo with a QR scanner.</span></button><button type="button" className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`} onClick={() => setPaymentMethod('cash')}><strong>Cash Payment</strong><span>Pay when you arrive at the turf.</span></button></div>{errors.paymentMethod && <span className="inline-error">{errors.paymentMethod}</span>}</section><BookingSummary turf={turf} booking={booking} paymentMethod={paymentMethod} /><button type="submit" className="btn btn-primary form-submit">Book Now</button></form></div></>;
}

function BookingField({ label, value, onChange, error, ...props }) { return <label className="form-field"><span>{label} <b>*</b></span><input {...props} value={value} onChange={(event) => onChange(event.target.value)} />{error && <small className="inline-error">{error}</small>}</label>; }
function BookingSelect({ label, value, onChange, options, error }) { return <label className="form-field"><span>{label} <b>*</b></span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select a game</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>{error && <small className="inline-error">{error}</small>}</label>; }
function BookingSummary({ turf, booking, paymentMethod }) { return <section className="booking-summary"><div className="form-section-title"><span>SUMMARY</span><h2>Your booking</h2></div><div className="summary-list"><SummaryItem label="Turf Name" value={turf.name} /><SummaryItem label="Selected Game" value={booking.game || 'Not selected'} /><SummaryItem label="Booking Date" value={formatDate(booking.date)} /><SummaryItem label="Time" value={`${booking.fromTime || '--:--'} to ${booking.toTime || '--:--'}`} /><SummaryItem label="User Name" value={booking.name || 'Not entered'} /><SummaryItem label="Mobile" value={booking.mobile || 'Not entered'} /><SummaryItem label="Email" value={booking.email || 'Not entered'} /><SummaryItem label="Total" value={turf.price} /><SummaryItem label="Payment" value={paymentMethod ? (paymentMethod === 'online' ? 'Online Payment' : 'Cash Payment') : 'Not selected'} /></div></section>; }
function SummaryItem({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function PaymentScreen({ turf, booking, onConfirm, onBack }) { return <div className="flow-panel payment-screen"><span className="section-kicker">DEMO PAYMENT</span><h1>COMPLETE YOUR PAYMENT.</h1><p>Scan the code or use your preferred payment app to pay for this booking.</p><div className="payment-screen-grid"><div className="qr-code" aria-label="Demo payment QR code" style={{ backgroundImage: `url(${scannerImage})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} /><div className="payment-details"><SummaryItem label="Amount" value={turf.price} /><SummaryItem label="Turf" value={turf.name} /><SummaryItem label="Game" value={booking.game} /><SummaryItem label="Date & time" value={`${formatDate(booking.date)} · ${booking.fromTime} to ${booking.toTime}`} /></div></div><div className="flow-actions"><button type="button" className="btn btn-secondary" onClick={onBack}>Back to booking</button><button type="button" className="btn btn-primary" onClick={onConfirm}>I have completed payment</button></div></div>; }
function BookingSuccess({ turf, booking }) { const isOnline = booking.paymentMethod === 'Online'; return <div className="flow-panel success-panel"><span className="success-mark">✓</span><span className="section-kicker">BOOKING CONFIRMED</span><h1>BOOKING SUCCESSFULLY DONE</h1><p className="success-note">{isOnline ? 'Please show your payment proof or payment screenshot when you arrive at the turf.' : 'Please complete the payment first when you arrive at the turf.'}</p><div className="confirmation-details"><SummaryItem label="Turf Name" value={turf.name} /><SummaryItem label="Game" value={booking.game} /><SummaryItem label="Date" value={formatDate(booking.bookingDate)} /><SummaryItem label="From Time" value={booking.fromTime} /><SummaryItem label="To Time" value={booking.toTime} /><SummaryItem label="Payment Method" value={booking.paymentMethod} /><SummaryItem label="Booking Status" value={booking.bookingStatus} /></div><button type="button" className="btn btn-primary" onClick={() => { window.location.href = '/book-your-turf'; }}>Book another turf</button></div>; }

export default BookingPage;