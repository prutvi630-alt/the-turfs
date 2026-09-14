import { useState } from 'react';
import { sports } from './data/homeData';
import { getAllTurfs, getBookings, getDemoState, getSession, getTurfOwnerId, saveBookings } from './data/demoStore';
import GlobalHeader, { navItems } from './GlobalHeader';

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not selected';
const overlaps = (fromTime, toTime, slotFrom, slotTo) => fromTime < slotTo && toTime > slotFrom;

const normalizeTurf = (turf = {}) => ({
  ...turf,
  id: turf.id,
  name: turf.name || turf.turfName,
  image: turf.image || turf.images?.[0] || turf.primaryImage || '',
  area: turf.area || turf.turfAddress?.area || turf.location || 'Vadodara',
  sports: Array.isArray(turf.sports) && turf.sports.length ? turf.sports : (Array.isArray(turf.games) ? turf.games : [turf.sport || 'Cricket']),
});

const getSelectedTurf = () => getAllTurfs().find((turf) => turf.id === window.location.pathname.split('/').filter(Boolean)[1]);

function BookingPage() {
  const allTurfs = getAllTurfs().map(normalizeTurf);
  const selectedTurf = getSelectedTurf() ? normalizeTurf(getSelectedTurf()) : null;
  if (selectedTurf) return <TurfBookingFlow turf={selectedTurf} />;

  return (
    <div className="page-shell booking-page">
      <GlobalHeader />
      <main className="container section-spacing">
        <div className="section-heading">
          <span className="section-kicker">BOOK YOUR TURF</span>
          <h1>FIND THE RIGHT PLACE FOR YOUR NEXT GAME.</h1>
          <p>Explore sports venues across Vadodara and join the platform to book your preferred turf.</p>
        </div>
        <div className="turfs-grid">
          {allTurfs.map((turf) => (
            <article key={turf.id} className="turf-card" onClick={() => { window.location.href = `/book-your-turf/${turf.id}`; }}>
              <div className="turf-image-wrap">
                <img src={turf.image} alt={turf.name} loading="lazy" />
                <span className="area-badge">{turf.area || turf.location || 'Vadodara'}</span>
              </div>
              <div className="turf-card-body">
                <h2>{turf.name}</h2>
                <p className="turf-location">{turf.area || turf.location || 'Vadodara'}, Vadodara</p>
                <div className="meta-line"><span>Sports:</span><strong>{(turf.sports || []).join(' • ')}</strong></div>
                <button type="button" className="btn btn-primary" onClick={(event) => { event.stopPropagation(); window.location.href = `/book-your-turf/${turf.id}`; }}>Book This Turf</button>
              </div>
            </article>
          ))}
        </div>
      </main>
      <BookingFooter />
    </div>
  );
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
  </main><BookingFooter /></div>;
}

function BookingFooter() {
  const navigate = (href) => { window.location.href = href; };

  return <footer className="site-footer"><div className="container footer-grid"><div className="footer-brand"><h3>SPORTS BELONG TO EVERYONE.</h3><p>Building a connected sports community for Vadodara — one game, one venue and one tournament at a time.</p><div className="socials"><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a><a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a></div></div><div className="footer-column"><h4>PLATFORM</h4><ul>{navItems.map((item) => <li key={item.label}><button type="button" onClick={() => navigate(item.href)}>{item.label}</button></li>)}</ul></div><div className="footer-column"><h4>SPORTS</h4><ul>{sports.map((sport) => <li key={sport.id}>{sport.name}</li>)}</ul></div><div className="footer-column"><h4>JOIN</h4><ul><li><button type="button" onClick={() => navigate('/login')}>Login</button></li><li><button type="button" onClick={() => navigate('/signup')}>Sign Up</button></li><li><button type="button" onClick={() => navigate('/signup')}>Register Your Turf</button></li></ul></div><div className="footer-column"><h4>ABOUT</h4><ul><li><button type="button" onClick={() => navigate('/about')}>Our Story</button></li><li><button type="button" onClick={() => navigate('/tournaments')}>Tournaments</button></li></ul></div></div><div className="footer-bottom"><div className="container footer-bottom-inner"><span>© 2026 Vadodara Sports Platform. All rights reserved.</span><span>Made for the sports community of Vadodara.</span></div></div></footer>;
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
function PaymentScreen({ turf, booking, onConfirm, onBack }) { return <div className="flow-panel payment-screen"><span className="section-kicker">DEMO PAYMENT</span><h1>COMPLETE YOUR PAYMENT.</h1><p>Scan the code or use your preferred payment app to pay for this booking.</p><div className="payment-screen-grid"><div className="qr-code" aria-label="Demo payment QR code" /><div className="payment-details"><SummaryItem label="Amount" value={turf.price} /><SummaryItem label="Turf" value={turf.name} /><SummaryItem label="Game" value={booking.game} /><SummaryItem label="Date & time" value={`${formatDate(booking.date)} · ${booking.fromTime} to ${booking.toTime}`} /></div></div><div className="flow-actions"><button type="button" className="btn btn-secondary" onClick={onBack}>Back to booking</button><button type="button" className="btn btn-primary" onClick={onConfirm}>I have completed payment</button></div></div>; }
function BookingSuccess({ turf, booking }) { const isOnline = booking.paymentMethod === 'Online'; return <div className="flow-panel success-panel"><span className="success-mark">✓</span><span className="section-kicker">BOOKING CONFIRMED</span><h1>BOOKING SUCCESSFULLY DONE</h1><p className="success-note">{isOnline ? 'Please show your payment proof or payment screenshot when you arrive at the turf.' : 'Please complete the payment first when you arrive at the turf.'}</p><div className="confirmation-details"><SummaryItem label="Turf Name" value={turf.name} /><SummaryItem label="Game" value={booking.game} /><SummaryItem label="Date" value={formatDate(booking.bookingDate)} /><SummaryItem label="From Time" value={booking.fromTime} /><SummaryItem label="To Time" value={booking.toTime} /><SummaryItem label="Payment Method" value={booking.paymentMethod} /><SummaryItem label="Booking Status" value={booking.bookingStatus} /></div><button type="button" className="btn btn-primary" onClick={() => { window.location.href = '/book-your-turf'; }}>Book another turf</button></div>; }

export default BookingPage;