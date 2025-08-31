# Configuration Email pour le Système de Facturation

## 🚀 Modes de fonctionnement

### 1. Mode Simulation (Recommandé pour le développement)
Ajouter dans `.env.local` :
```bash
EMAIL_MODE=simulate
```
✅ **Avantages** : Aucun email n'est envoyé, mais la facture est générée et l'opération est simulée  
✅ **Idéal pour** : Tests locaux, développement, démos

### 2. Mode Test (Ethereal Email)
Aucune configuration requise en mode développement.  
✅ **Avantages** : Emails de test avec URL de prévisualisation  
✅ **Idéal pour** : Tests d'intégration

### 3. Mode Production
Configurer dans `.env.local` :
```bash
# SMTP Configuration
SMTP_HOST=votre-serveur-smtp.com
SMTP_PORT=465
SMTP_USER=votre-email@domaine.com
SMTP_PASS=votre-mot-de-passe
SMTP_FROM=noreply@votre-domaine.com
```

## 📧 Services SMTP recommandés

### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
```

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=votre-email@outlook.com
SMTP_PASS=votre-mot-de-passe
```

### Services professionnels (SendGrid, Mailgun, etc.)
Consultez la documentation de votre provider.

## 🔧 Résolution des problèmes

### Erreur "Hostname/IP does not match certificate's altnames"
Cette erreur est maintenant gérée automatiquement avec `rejectUnauthorized: false`.

### Emails non reçus
1. Vérifiez vos paramètres SMTP
2. Utilisez le mode simulation pour tester la génération de factures
3. Consultez les logs du serveur pour plus de détails

## 🧪 Tests

Pour tester l'envoi d'emails :
1. Activez le mode simulation : `EMAIL_MODE=simulate`
2. Demandez une facture depuis l'interface client
3. Vérifiez les logs dans la console du serveur

Les logs afficheront :
```
📧 Email simulé avec succès vers: client@example.com
📄 Contenu HTML de la facture généré
```

## 🔒 Sécurité

- Ne jamais committer les identifiants SMTP dans le code
- Utiliser des variables d'environnement pour tous les paramètres sensibles
- En production, utiliser des services SMTP sécurisés avec authentification

## 📝 Format des factures

Les factures sont générées en HTML avec :
- Informations client et entreprise
- Détail des articles avec TVA
- Calculs automatiques HT/TTC
- Mise en forme professionnelle