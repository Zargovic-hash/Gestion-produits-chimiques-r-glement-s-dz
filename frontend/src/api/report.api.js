import api from './axios';

const download = async (path, params, fallbackFilename) => {
  try {
    const response = await api.get(path, { params, responseType: 'blob' });
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="(.+)"/);
    const filename = match ? match[1] : fallbackFilename;

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // Les réponses d'erreur arrivent aussi en Blob (responseType: 'blob'), on les reconvertit en JSON
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try {
        err.response.data = JSON.parse(text);
      } catch {
        // laisse err.response.data tel quel si ce n'est pas du JSON
      }
    }
    throw err;
  }
};

export const downloadAutorisationsReport = (params) =>
  download('/reports/autorisations', params, 'rapport_etat_autorisations.pdf');

export const downloadAutorisationDetailReport = (id) =>
  download(`/reports/autorisations/${id}`, {}, 'rapport_autorisation.pdf');

export const downloadAchatsReport = (params) =>
  download('/reports/achats', params, 'rapport_historique_achats.pdf');

export const downloadProduitsReport = (params) =>
  download('/reports/produits', params, 'rapport_produits.pdf');

export const downloadDepartementsReport = (params) =>
  download('/reports/departements', params, 'rapport_departements.pdf');
