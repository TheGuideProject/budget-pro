import jsPDF from 'jspdf';

export function generateUserManualPdf(): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const colors = {
    primary: [59, 130, 246] as [number, number, number],
    text: [30, 30, 30] as [number, number, number],
    muted: [100, 100, 100] as [number, number, number],
    light: [240, 240, 240] as [number, number, number],
  };

  const addNewPage = () => {
    doc.addPage();
    y = margin;
    addPageNumber();
  };

  const checkPageBreak = (height: number) => {
    if (y + height > pageHeight - margin) {
      addNewPage();
    }
  };

  const addPageNumber = () => {
    const pageNum = doc.getNumberOfPages();
    if (pageNum > 1) {
      doc.setFontSize(10);
      doc.setTextColor(...colors.muted);
      doc.text(`Pagina ${pageNum - 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
  };

  const addTitle = (text: string, size: number = 18) => {
    checkPageBreak(15);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(text, margin, y);
    y += size * 0.5 + 5;
  };

  const addSubtitle = (text: string) => {
    checkPageBreak(12);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text(text, margin, y);
    y += 10;
  };

  const addParagraph = (text: string) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * 6);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 4;
  };

  const addBullet = (text: string, indent: number = 0) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const bulletX = margin + indent;
    const textX = bulletX + 8;
    const lines = doc.splitTextToSize(text, contentWidth - indent - 8);
    checkPageBreak(lines.length * 6);
    doc.text('•', bulletX, y);
    doc.text(lines, textX, y);
    y += lines.length * 6 + 2;
  };

  const addNumberedItem = (num: number, text: string) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    const numStr = `${num}.`;
    checkPageBreak(8);
    doc.text(numStr, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const lines = doc.splitTextToSize(text, contentWidth - 12);
    doc.text(lines, margin + 12, y);
    y += lines.length * 6 + 3;
  };

  const addTip = (text: string) => {
    checkPageBreak(20);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, y - 4, contentWidth, 16, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 120, 0);
    doc.text('💡 Suggerimento:', margin + 4, y + 4);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - 50);
    doc.text(lines, margin + 40, y + 4);
    y += 18;
  };

  const addSection = (title: string) => {
    checkPageBreak(25);
    y += 8;
    doc.setFillColor(...colors.primary);
    doc.roundedRect(margin, y - 6, contentWidth, 12, 2, 2, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 5, y + 2);
    y += 15;
  };

  const addSpacer = (height: number = 8) => {
    y += height;
  };

  // ==================== COVER PAGE ====================
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BudgetPro', pageWidth / 2, 40, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text('Manuale d\'Uso Completo', pageWidth / 2, 55, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(...colors.muted);
  doc.text(`Versione 1.0 - ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, 100, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(...colors.text);
  doc.text('Gestione Fatture, Spese e Budget', pageWidth / 2, 130, { align: 'center' });
  doc.text('per Professionisti e Famiglie', pageWidth / 2, 142, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(...colors.muted);
  doc.text('BudgetPro', pageWidth / 2, pageHeight - 30, { align: 'center' });

  // ==================== INDEX PAGE ====================
  addNewPage();
  addTitle('Indice', 24);
  addSpacer(10);
  
  const indexItems = [
    '1. Introduzione',
    '2. Modalità Semplice',
    '3. Modalità Estesa - Dashboard',
    '4. Calendario e Eventi',
    '5. Gestione Fatture',
    '6. Gestione Spese',
    '7. Budget e Previsioni',
    '8. Analisi AI',
    '9. Budget Familiare',
    '10. Bollette e Utenze',
    '11. Spese Fisse e Abbonamenti',
    '12. Progetti e Clienti',
    '13. Azioni Rapide',
    '14. Funzionalità Avanzate',
    '15. FAQ e Troubleshooting',
  ];
  
  indexItems.forEach(item => {
    doc.setFontSize(12);
    doc.setTextColor(...colors.text);
    doc.text(item, margin, y);
    y += 10;
  });

  // ==================== 1. INTRODUCTION ====================
  addNewPage();
  addTitle('1. Introduzione', 20);
  addSpacer();
  
  addParagraph('BudgetPro è un\'applicazione completa per la gestione finanziaria personale e professionale. È progettata per liberi professionisti, consulenti e famiglie che vogliono tenere traccia di fatture, spese e budget in modo semplice e intuitivo.');
  addSpacer();
  
  addSubtitle('Due Modalità di Utilizzo');
  addParagraph('L\'app offre due modalità di utilizzo per adattarsi alle tue esigenze:');
  addBullet('Modalità Semplice: perfetta per chi vuole solo tracciare le spese personali quotidiane');
  addBullet('Modalità Estesa: completa di tutte le funzionalità per professionisti (fatture, progetti, analisi AI)');
  addSpacer();
  
  addTip('Puoi passare da una modalità all\'altra in qualsiasi momento dal menu laterale.');

  // ==================== 2. SIMPLE MODE ====================
  addNewPage();
  addTitle('2. Modalità Semplice', 20);
  addSpacer();
  
  addParagraph('La Modalità Semplice è ideale per utenti che vogliono tracciare rapidamente le spese quotidiane senza funzionalità avanzate.');
  addSpacer();
  
  addSubtitle('Home');
  addParagraph('La schermata principale mostra un riepilogo del mese corrente con:');
  addBullet('Saldo totale e spese del mese');
  addBullet('Lista delle spese recenti');
  addBullet('Grafico ripartizione per categoria');
  addSpacer();
  
  addSubtitle('4 Modi per Inserire Spese');
  addSpacer(4);
  
  addNumberedItem(1, 'Input Vocale: premi il pulsante microfono e dì ad esempio "Ho speso 50 euro al supermercato ieri". L\'AI riconoscerà automaticamente importo, categoria e data.');
  addNumberedItem(2, 'Manuale: clicca il pulsante "+" e compila il form con descrizione, importo, categoria e data.');
  addNumberedItem(3, 'OCR Scontrino: fotografa lo scontrino e l\'AI estrarrà automaticamente tutti i dati.');
  addNumberedItem(4, 'Import Banca: carica il CSV dell\'estratto conto o fotografalo per importare automaticamente le transazioni.');
  
  addSpacer();
  addTip('L\'input vocale è il modo più veloce! Basta un comando e la spesa viene registrata.');

  // ==================== 3. DASHBOARD ====================
  addNewPage();
  addTitle('3. Modalità Estesa - Dashboard', 20);
  addSpacer();
  
  addParagraph('La Dashboard è la schermata principale della Modalità Estesa e offre una panoramica completa della situazione finanziaria.');
  addSpacer();
  
  addSubtitle('Elementi della Dashboard');
  addBullet('Statistiche riassuntive: fatturato, incassato, da ricevere, spese');
  addBullet('Alert fatture scadute: notifiche per pagamenti in ritardo');
  addBullet('Grafici: ripartizione entrate/uscite');
  addBullet('Tabella fatture recenti con stato');
  addSpacer();
  
  addSubtitle('Utente Primario vs Secondario');
  addParagraph('In un account familiare:');
  addBullet('Utente Primario: accesso completo a tutte le funzionalità');
  addBullet('Utente Secondario: vede solo le proprie spese e il budget assegnato');

  // ==================== 4. CALENDAR ====================
  addNewPage();
  addTitle('4. Calendario e Eventi', 20);
  addSpacer();
  
  addParagraph('Il Calendario ti permette di visualizzare e gestire eventi finanziari, scadenze e promemoria.');
  addSpacer();
  
  addSubtitle('Tipi di Eventi');
  addBullet('Scadenze fatture: mostrate automaticamente');
  addBullet('Pagamenti attesi: incassi previsti');
  addBullet('Promemoria bollette: scadenze utenze');
  addBullet('Eventi personalizzati: qualsiasi promemoria');
  addSpacer();
  
  addSubtitle('Creare un Evento');
  addNumberedItem(1, 'Clicca su "Nuovo Evento" nella sidebar o direttamente su un giorno');
  addNumberedItem(2, 'Inserisci titolo, data, orario (opzionale)');
  addNumberedItem(3, 'Seleziona il tipo di evento e il colore');
  addNumberedItem(4, 'Imposta promemoria se necessario');
  addNumberedItem(5, 'Salva l\'evento');
  
  addSpacer();
  addTip('Puoi generare automaticamente eventi dal Piano Lavoro nella sezione Analisi AI.');

  // ==================== 5. INVOICES ====================
  addNewPage();
  addTitle('5. Gestione Fatture', 20);
  addSpacer();
  
  addParagraph('La sezione Fatture ti permette di creare, gestire e tracciare tutte le fatture emesse.');
  addSpacer();
  
  addSubtitle('Stati di una Fattura');
  addBullet('Bozza: fattura in preparazione, non ancora inviata');
  addBullet('Inviata: fattura emessa e inviata al cliente');
  addBullet('Pagata Parzialmente: ricevuto un acconto');
  addBullet('Pagata: fattura completamente saldata');
  addBullet('Scaduta: data di scadenza superata senza pagamento');
  addSpacer();
  
  addSubtitle('Creare una Nuova Fattura');
  addNumberedItem(1, 'Clicca "Nuova Fattura" dalla sidebar o dalla pagina fatture');
  addNumberedItem(2, 'Compila i dati cliente (nome, indirizzo, P.IVA)');
  addNumberedItem(3, 'Aggiungi le voci (descrizione, quantità, prezzo)');
  addNumberedItem(4, 'Imposta data fattura e scadenza');
  addNumberedItem(5, 'Salva come bozza o invia direttamente');
  addSpacer();
  
  addSubtitle('Verifica Pagamenti');
  addParagraph('Quando ricevi un pagamento:');
  addNumberedItem(1, 'Apri la fattura corrispondente');
  addNumberedItem(2, 'Clicca su "Registra Pagamento"');
  addNumberedItem(3, 'Inserisci l\'importo ricevuto');
  addNumberedItem(4, 'Carica uno screenshot del bonifico (opzionale ma consigliato)');
  
  addSpacer();
  addTip('Usa l\'OCR per caricare fatture esistenti da PDF o immagini.');

  // ==================== 6. EXPENSES ====================
  addNewPage();
  addTitle('6. Gestione Spese', 20);
  addSpacer();
  
  addParagraph('Traccia tutte le spese con categorie, filtri e statistiche dettagliate.');
  addSpacer();
  
  addSubtitle('Categorie Spese');
  addBullet('Cibo e Ristoranti');
  addBullet('Trasporti');
  addBullet('Utenze (luce, gas, acqua)');
  addBullet('Abbonamenti e Servizi');
  addBullet('Salute');
  addBullet('Shopping');
  addBullet('Intrattenimento');
  addBullet('Altro');
  addSpacer();
  
  addSubtitle('Filtri Disponibili');
  addBullet('Per periodo: mese, trimestre, anno, personalizzato');
  addBullet('Per categoria: seleziona una o più categorie');
  addBullet('Per tipo: privata o aziendale');
  addBullet('Per metodo pagamento: contanti, carta, bonifico');
  addSpacer();
  
  addSubtitle('Modificare/Eliminare una Spesa');
  addParagraph('Clicca sulla riga della spesa per aprire il pannello di modifica. Da qui puoi cambiare tutti i dati o eliminare la spesa.');

  // ==================== 7. BUDGET ====================
  addNewPage();
  addTitle('7. Budget e Previsioni', 20);
  addSpacer();
  
  addParagraph('La sezione Budget offre grafici e strumenti per analizzare le tue finanze e pianificare il futuro.');
  addSpacer();
  
  addSubtitle('Grafici Disponibili');
  addBullet('Grafico a Torta: ripartizione spese per categoria');
  addBullet('Grafico a Barre: confronto mensile entrate/uscite');
  addBullet('Timeline: andamento nel tempo');
  addBullet('Waterfall: visualizzazione cash flow');
  addSpacer();
  
  addSubtitle('Previsioni');
  addParagraph('Il sistema calcola previsioni basate su:');
  addBullet('Storico spese degli ultimi mesi');
  addBullet('Fatture in attesa di pagamento');
  addBullet('Spese fisse e ricorrenti programmate');
  addBullet('Bollette stimate');
  addSpacer();
  
  addSubtitle('OCR Bollette');
  addParagraph('Carica le bollette per tracciare automaticamente consumi e costi delle utenze. L\'AI estrae provider, importo, periodo e consumi.');
  
  addSpacer();
  addTip('Imposta le stime costi nella sezione Impostazioni per previsioni più accurate.');

  // ==================== 8. AI ANALYSIS ====================
  addNewPage();
  addTitle('8. Analisi AI', 20);
  addSpacer();
  
  addParagraph('La sezione Analisi AI sfrutta l\'intelligenza artificiale per fornire insights avanzati e pianificazione finanziaria.');
  addSpacer();
  
  addSubtitle('Piano Mese per Mese');
  addParagraph('Genera un piano dettagliato dei prossimi mesi con:');
  addBullet('Entrate previste (fatture da incassare)');
  addBullet('Spese stimate (storiche + fisse)');
  addBullet('Saldo previsto fine mese');
  addBullet('Carryover: riporto automatico avanzo/deficit');
  addSpacer();
  
  addSubtitle('Switch "Includi Bozze"');
  addParagraph('Attiva questo switch per includere anche le fatture in stato Bozza nelle previsioni. Utile quando hai lavori in corso che fatturerai a breve.');
  addSpacer();
  
  addSubtitle('Calendario AI');
  addParagraph('Genera automaticamente eventi calendario basati sul piano lavoro:');
  addBullet('Scadenze fatture');
  addBullet('Date pagamento attese');
  addBullet('Promemoria per azioni');
  addSpacer();
  
  addSubtitle('Obiettivo Pensione');
  addParagraph('Calcola quanto devi risparmiare mensilmente per raggiungere un obiettivo di capitale entro una certa data, considerando rendimenti stimati S&P500.');
  addSpacer();
  
  addSubtitle('What-If Simulator');
  addParagraph('Simula scenari finanziari per prendere decisioni informate:');
  addBullet('Cosa succede se aumento le spese del 10%?');
  addBullet('Cosa succede se perdo un cliente?');
  addBullet('Quanto posso risparmiare riducendo certe spese?');

  // ==================== 9. FAMILY ====================
  addNewPage();
  addTitle('9. Budget Familiare', 20);
  addSpacer();
  
  addParagraph('Gestisci le finanze di famiglia con account collegati e trasferimenti budget.');
  addSpacer();
  
  addSubtitle('Invitare un Familiare');
  addNumberedItem(1, 'Vai alla sezione "Famiglia"');
  addNumberedItem(2, 'Copia il codice invito mostrato');
  addNumberedItem(3, 'Condividi il codice con il familiare');
  addNumberedItem(4, 'Il familiare crea un account e inserisce il codice');
  addSpacer();
  
  addSubtitle('Trasferimenti Budget');
  addParagraph('Trasferisci fondi dal budget principale al budget del familiare:');
  addNumberedItem(1, 'Seleziona il mese');
  addNumberedItem(2, 'Inserisci l\'importo');
  addNumberedItem(3, 'Aggiungi una descrizione (opzionale)');
  addNumberedItem(4, 'Conferma il trasferimento');
  addSpacer();
  
  addSubtitle('Carryover Automatico');
  addParagraph('L\'avanzo o deficit di un mese viene automaticamente riportato al mese successivo per ogni membro della famiglia.');
  
  addSpacer();
  addTip('Il familiare vede solo le proprie spese e il budget assegnato, non le fatture o altri dati sensibili.');

  // ==================== 10. BILLS ====================
  addNewPage();
  addTitle('10. Bollette e Utenze', 20);
  addSpacer();
  
  addParagraph('Traccia tutte le bollette delle utenze domestiche con storico consumi e costi.');
  addSpacer();
  
  addSubtitle('Tipi di Utenze');
  addBullet('Luce (elettricità)');
  addBullet('Gas');
  addBullet('Acqua');
  addBullet('Internet');
  addBullet('Telefono');
  addBullet('Rifiuti');
  addBullet('Condominio');
  addSpacer();
  
  addSubtitle('Caricare una Bolletta');
  addNumberedItem(1, 'Clicca "Carica Bolletta" o "Upload Bulk"');
  addNumberedItem(2, 'Seleziona o fotografa la bolletta');
  addNumberedItem(3, 'L\'OCR estrae: importo, periodo, consumi, fornitore');
  addNumberedItem(4, 'Verifica i dati e conferma');
  addSpacer();
  
  addSubtitle('Storico e Confronti');
  addParagraph('Visualizza l\'andamento dei costi e consumi nel tempo per ogni fornitore. Utile per capire se stai risparmiando.');
  
  addSpacer();
  addTip('Usa "Upload Bulk" per caricare più bollette contemporaneamente.');

  // ==================== 11. FIXED EXPENSES ====================
  addNewPage();
  addTitle('11. Spese Fisse e Abbonamenti', 20);
  addSpacer();
  
  addParagraph('Gestisci abbonamenti ricorrenti e spese fisse mensili per avere previsioni accurate.');
  addSpacer();
  
  addSubtitle('Tipi di Spese Fisse');
  addBullet('Abbonamenti streaming (Netflix, Spotify, etc.)');
  addBullet('Palestra e fitness');
  addBullet('Assicurazioni');
  addBullet('Rate e finanziamenti');
  addBullet('Affitto');
  addBullet('Altro ricorrente');
  addSpacer();
  
  addSubtitle('Aggiungere una Spesa Fissa');
  addNumberedItem(1, 'Clicca "Nuova Spesa Fissa"');
  addNumberedItem(2, 'Inserisci descrizione e importo');
  addNumberedItem(3, 'Seleziona frequenza: mensile, trimestrale, annuale');
  addNumberedItem(4, 'Imposta data prossimo addebito');
  addNumberedItem(5, 'Salva');
  addSpacer();
  
  addParagraph('Le spese fisse vengono automaticamente incluse nelle previsioni budget e nel piano mese per mese.');

  // ==================== 12. PROJECTS ====================
  addNewPage();
  addTitle('12. Progetti e Clienti', 20);
  addSpacer();
  
  addParagraph('Organizza il lavoro per progetti e clienti per tracciare fatturato e spese per commessa.');
  addSpacer();
  
  addSubtitle('Creare un Progetto');
  addNumberedItem(1, 'Vai alla sezione "Progetti"');
  addNumberedItem(2, 'Clicca "Nuovo Progetto"');
  addNumberedItem(3, 'Inserisci nome progetto e cliente');
  addNumberedItem(4, 'Aggiungi descrizione (opzionale)');
  addNumberedItem(5, 'Salva');
  addSpacer();
  
  addSubtitle('Collegare Fatture e Spese');
  addParagraph('Quando crei una fattura o registri una spesa, puoi associarla a un progetto. Questo permette di calcolare:');
  addBullet('Fatturato totale per progetto');
  addBullet('Spese sostenute per progetto');
  addBullet('Margine effettivo');
  addSpacer();
  
  addSubtitle('Report Pinfabb');
  addParagraph('Per progetti di consulenza, puoi generare report strutturati in formato Pinfabb con l\'assistenza dell\'AI.');

  // ==================== 13. QUICK ACTIONS ====================
  addNewPage();
  addTitle('13. Azioni Rapide', 20);
  addSpacer();
  
  addParagraph('Le Azioni Rapide nella sidebar permettono di eseguire operazioni comuni con un solo click.');
  addSpacer();
  
  addSubtitle('Input Vocale');
  addParagraph('Registra spese parlando. L\'AI riconosce importo, categoria e data automaticamente.');
  addBullet('Esempio: "Ho speso 35 euro dal meccanico ieri"');
  addBullet('Esempio: "Pranzo 15 euro oggi"');
  addSpacer();
  
  addSubtitle('Scansiona OCR');
  addParagraph('Fotografa scontrini, ricevute o documenti. L\'OCR estrae tutti i dati rilevanti.');
  addSpacer();
  
  addSubtitle('Import Banca');
  addParagraph('Carica l\'estratto conto in CSV o come immagine per importare automaticamente le transazioni.');
  addSpacer();
  
  addSubtitle('Nuova Fattura');
  addParagraph('Accesso rapido alla creazione di una nuova fattura.');
  addSpacer();
  
  addSubtitle('Nuovo Evento');
  addParagraph('Crea rapidamente un promemoria o un evento nel calendario.');
  addSpacer();
  
  addSubtitle('Chiedi all\'AI');
  addParagraph('Apri la chat con l\'assistente AI per domande sui tuoi dati finanziari o su come usare l\'app.');

  // ==================== 14. ADVANCED FEATURES ====================
  addNewPage();
  addTitle('14. Funzionalità Avanzate', 20);
  addSpacer();
  
  addSubtitle('Switch "Includi Bozze"');
  addParagraph('Nelle previsioni, questo switch permette di considerare anche le fatture in stato Bozza come entrate future. L\'importo viene evidenziato in ambra per distinguerlo.');
  addSpacer();
  
  addSubtitle('Carryover Budget');
  addParagraph('Il sistema calcola automaticamente il riporto da un mese all\'altro:');
  addBullet('Avanzo: viene aggiunto al budget del mese successivo');
  addBullet('Deficit: viene sottratto dal budget del mese successivo');
  addSpacer();
  
  addSubtitle('Verifica Pagamenti con Screenshot');
  addParagraph('Quando registri un pagamento ricevuto, puoi caricare uno screenshot del bonifico come prova. Questo viene allegato alla fattura.');
  addSpacer();
  
  addSubtitle('Export PDF Fatture');
  addParagraph('Genera fatture in formato PDF professionale pronte per l\'invio al cliente. Include tutti i dati aziendali, voci, totali e coordinate bancarie.');
  addSpacer();
  
  addSubtitle('Esclusione Fatture dal Budget');
  addParagraph('Puoi escludere specifiche fatture dal calcolo del budget se rappresentano entrate straordinarie o non ricorrenti.');

  // ==================== 15. FAQ ====================
  addNewPage();
  addTitle('15. FAQ e Troubleshooting', 20);
  addSpacer();
  
  addSubtitle('L\'OCR non riconosce correttamente i dati');
  addParagraph('Assicurati che l\'immagine sia nitida e ben illuminata. Evita ombre e riflessi. Se il problema persiste, inserisci i dati manualmente.');
  addSpacer();
  
  addSubtitle('L\'input vocale non funziona');
  addParagraph('Verifica di aver concesso i permessi del microfono al browser. Parla chiaramente e specifica sempre l\'importo.');
  addSpacer();
  
  addSubtitle('Le previsioni sembrano imprecise');
  addParagraph('Le previsioni migliorano con più dati storici. Inoltre, verifica di aver impostato correttamente le stime costi nelle Impostazioni.');
  addSpacer();
  
  addSubtitle('Non vedo alcune sezioni');
  addParagraph('Se sei un utente Secondario (familiare), alcune sezioni come Fatture e Progetti non sono visibili. Chiedi all\'utente Primario se necessario.');
  addSpacer();
  
  addSubtitle('Come cambio la modalità (Semplice/Estesa)?');
  addParagraph('Nella sidebar (menu laterale) trovi il pulsante "Versione Semplice" o "Versione Estesa" per passare da una modalità all\'altra.');
  addSpacer();
  
  addSubtitle('Come contatto il supporto?');
  addParagraph('Per assistenza, contatta Q-Consulting LLC attraverso i canali ufficiali.');

  // Final footer on last page
  addSpacer(20);
  doc.setFontSize(10);
  doc.setTextColor(...colors.muted);
  doc.text('Grazie per aver scelto BudgetPro!', pageWidth / 2, pageHeight - 30, { align: 'center' });
  doc.text('© Q-Consulting LLC - Tutti i diritti riservati', pageWidth / 2, pageHeight - 22, { align: 'center' });

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(...colors.muted);
    doc.text(`Pagina ${i - 1} di ${totalPages - 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save the PDF
  doc.save(`BudgetPro_Manuale_${new Date().toISOString().split('T')[0]}.pdf`);
}
