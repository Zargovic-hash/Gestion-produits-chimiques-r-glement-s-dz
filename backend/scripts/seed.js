require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/db');

const DEFAULT_PRODUCTS = [
  { code: 'CHEM-001', designation: 'Acide sulfurique', onu: '1830', cas: '7664-93-9', chimique: 'H2SO4 95%', unite: 'L', departement: 'Laboratoire' },
  { code: 'CHEM-002', designation: 'Acétone', onu: '1090', cas: '67-64-1', chimique: 'CH3COCH3 99%', unite: 'L', departement: 'Laboratoire' },
  { code: 'CHEM-003', designation: 'Benzène', onu: '1114', cas: '71-43-2', chimique: 'C6H6 99.5%', unite: 'L', departement: 'Recherche' },
  { code: 'CHEM-004', designation: 'Méthanol', onu: '1230', cas: '67-56-1', chimique: 'CH3OH 99%', unite: 'L', departement: 'Laboratoire' },
  { code: 'CHEM-005', designation: 'Toluène', onu: '1294', cas: '108-88-3', chimique: 'C7H8 99%', unite: 'L', departement: 'Recherche' },
  { code: 'CHEM-006', designation: 'Hydroxyde de sodium', onu: '1823', cas: '1310-73-2', chimique: 'NaOH 98%', unite: 'kg', departement: 'Production' },
  { code: 'CHEM-007', designation: 'Chlorure d\'hydrogène', onu: '1789', cas: '7647-01-0', chimique: 'HCl 37%', unite: 'L', departement: 'Production' },
  { code: 'CHEM-008', designation: 'Éthanol', onu: '1170', cas: '64-17-5', chimique: 'C2H5OH 96%', unite: 'L', departement: 'Laboratoire' },
  { code: 'CHEM-009', designation: 'Peroxyde d\'hydrogène', onu: '2014', cas: '7722-84-1', chimique: 'H2O2 30%', unite: 'L', departement: 'R&D' },
  { code: 'CHEM-010', designation: 'Ammoniac', onu: '2672', cas: '1336-21-6', chimique: 'NH4OH 20%', unite: 'L', departement: 'Production' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const adminEmail = 'admin@gestion-chimique.local';
    const { rows: existing } = await client.query('SELECT id FROM utilisateurs WHERE email = $1', [adminEmail]);

    let adminId;
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash('Admin123!', 12);
      const { rows } = await client.query(
        `INSERT INTO utilisateurs (email, password_hash, nom, prenom, role)
         VALUES ($1, $2, $3, $4, 'admin') RETURNING id`,
        [adminEmail, passwordHash, 'Admin', 'Système']
      );
      adminId = rows[0].id;
      console.log(`Utilisateur admin créé : ${adminEmail} / Admin123!`);
    } else {
      adminId = existing[0].id;
      console.log('Utilisateur admin déjà existant, réutilisation.');
    }

    // Utilisateur Responsable Stock de démonstration
    const stockEmail = 'stock@gestion-chimique.local';
    const { rows: existingStock } = await client.query('SELECT id FROM utilisateurs WHERE email = $1', [stockEmail]);
    if (existingStock.length === 0) {
      const passwordHash = await bcrypt.hash('Stock123!', 12);
      await client.query(
        `INSERT INTO utilisateurs (email, password_hash, nom, prenom, role, departement, created_by)
         VALUES ($1, $2, $3, $4, 'responsable_stock', 'Laboratoire', $5)`,
        [stockEmail, passwordHash, 'Benali', 'Karim', adminId]
      );
      console.log(`Utilisateur Responsable Stock créé : ${stockEmail} / Stock123!`);
    }

    // Utilisateur Visiteur de démonstration
    const viewerEmail = 'visiteur@gestion-chimique.local';
    const { rows: existingViewer } = await client.query('SELECT id FROM utilisateurs WHERE email = $1', [viewerEmail]);
    if (existingViewer.length === 0) {
      const passwordHash = await bcrypt.hash('Visiteur123!', 12);
      await client.query(
        `INSERT INTO utilisateurs (email, password_hash, nom, prenom, role, created_by)
         VALUES ($1, $2, $3, $4, 'visiteur', $5)`,
        [viewerEmail, passwordHash, 'Consultant', 'Visiteur', adminId]
      );
      console.log(`Utilisateur Visiteur créé : ${viewerEmail} / Visiteur123!`);
    }

    // Canevas par défaut
    const { rows: existingCanevas } = await client.query(
      "SELECT id FROM canevas WHERE is_default = true LIMIT 1"
    );
    if (existingCanevas.length === 0) {
      const { rows: canevasRows } = await client.query(
        `INSERT INTO canevas (nom, description, is_default, created_by)
         VALUES ($1, $2, true, $3) RETURNING id`,
        ['Canevas Laboratoire Chimie Standard', 'Canevas d\'exemple fourni avec l\'application', adminId]
      );
      const canevasId = canevasRows[0].id;

      for (const p of DEFAULT_PRODUCTS) {
        await client.query(
          `INSERT INTO canevas_produits (
            canevas_id, product_code, designation_technique, numero_onu, numero_cas,
            designation_chimique, unite, departement
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [canevasId, p.code, p.designation, p.onu, p.cas, p.chimique, p.unite, p.departement]
        );
      }
      console.log('Canevas par défaut créé avec 10 produits.');
    } else {
      console.log('Canevas par défaut déjà existant.');
    }

    await client.query('COMMIT');
    console.log('Seed terminé avec succès.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur de seed :', error);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
