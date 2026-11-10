// E-mail de l'export, sur le gabarit des e-mails du compte (supabase/templates). Valeurs de
// docs/design/tokens.json, en dur : un e-mail ne lit pas de variables.

export const subject = 'Tes données Commedab';

export const text =
  "Voici tes données Commedab en pièce jointe : tes produits, tes achats, tes recettes, ta liste et l'ordre de tes rayons. Le fichier se lit sans l'application.";

const display = "font-family: 'Fraunces', Georgia, 'Times New Roman', serif";
const sans = "font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif";

export const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${subject}</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&amp;family=Manrope:wght@500;600;700&amp;display=swap"
      rel="stylesheet"
    />
    <style>
      :root { color-scheme: light dark; }
      h1, td { text-wrap: pretty; }
      @media (prefers-color-scheme: dark) {
        .ground { background-color: #181410 !important; }
        .ink { color: #f2eae0 !important; }
        .ink-muted { color: #a89c8e !important; }
      }
    </style>
  </head>
  <body class="ground" style="margin: 0; padding: 0; background-color: #f3ede3">
    <table role="presentation" class="ground" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3EDE3" style="background-color: #f3ede3">
      <tr>
        <td align="center" style="padding: 32px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 448px">
            <tr>
              <td class="ink" style="padding-bottom: 32px; ${display}; font-size: 20px; line-height: 26px; font-weight: 600; color: #241f1a">
                Commedab
              </td>
            </tr>
            <tr>
              <td>
                <h1 class="ink" style="margin: 0; ${display}; font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: -0.3px; color: #241f1a">
                  Tes données
                </h1>
              </td>
            </tr>
            <tr>
              <td class="ink-muted" style="padding-top: 8px; ${display}; font-size: 18px; line-height: 24px; font-weight: 500; color: #6e645a">
                Voici tes données Commedab en pièce jointe&nbsp;: tes produits, tes achats, tes recettes, ta liste et l'ordre de tes&nbsp;rayons.
              </td>
            </tr>
            <tr>
              <td class="ink-muted" style="padding-top: 16px; ${sans}; font-size: 14px; line-height: 20px; font-weight: 500; color: #6e645a">
                Le fichier se lit sans l'application.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
