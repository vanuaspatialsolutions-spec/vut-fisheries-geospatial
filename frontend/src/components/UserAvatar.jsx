/**
 * Shared avatar component — shows a profile photo if available,
 * otherwise falls back to the user's initials.
 *
 * Props:
 *   user      — object with { firstName, lastName, photoURL }
 *   sizePx    — diameter in px (default 28)
 *   className — extra CSS classes applied to the element
 */
export default function UserAvatar({ user, sizePx = 28, className = '' }) {
  const initials =
    `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?';

  const style = {
    width:      sizePx,
    height:     sizePx,
    flexShrink: 0,
    fontSize:   Math.max(9, Math.round(sizePx * 0.38)),
  };

  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={initials}
        className={`rounded-full object-cover ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold select-none ${className}`}
      style={style}
    >
      {initials}
    </div>
  );
}
