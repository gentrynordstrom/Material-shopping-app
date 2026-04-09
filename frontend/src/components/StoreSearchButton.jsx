export default function StoreSearchButton({ store, url }) {
  const labels = {
    menards: 'Menards',
    homedepot: 'Home Depot',
  };

  const colors = {
    menards: 'btn-menards',
    homedepot: 'btn-homedepot',
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn btn-sm ${colors[store]}`}
    >
      Search {labels[store]}
    </a>
  );
}
