// Hilfsfunktionen für die Anwendung

// Importiere html2canvas und jsPDF
import html2canvas from "html2canvas"
import jspdf from "jspdf"

// LocalStorage-Wrapper
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error("Fehler beim Lesen aus dem LocalStorage:", error)
      return defaultValue
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error("Fehler beim Schreiben in den LocalStorage:", error)
      return false
    }
  },
}

// Zeigt eine Erfolgsmeldung an
function showSuccessMessage(message, duration = 3000) {
  const messageElement = document.getElementById("success-message")
  const textElement = document.getElementById("success-text")

  textElement.textContent = message
  messageElement.classList.remove("hidden")

  setTimeout(() => {
    messageElement.classList.add("hidden")
  }, duration)
}

// Generiert den Papierhintergrundstil basierend auf den Einstellungen
function getPaperStyle(paperStyle, gridSize, gridColor) {
  switch (paperStyle) {
    case "lined":
      return {
        backgroundImage: `linear-gradient(0deg, transparent ${gridSize - 1}px, ${gridColor} ${gridSize}px)`,
        backgroundSize: `100% ${gridSize}px`,
      }
    case "grid":
      return {
        backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
      }
    case "dotted":
      return {
        backgroundImage: `radial-gradient(${gridColor} 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: "0 0",
      }
    default:
      return {}
  }
}

// Zeichnet Hilfslinien auf dem Canvas
function drawGuideLines(ctx, guideLineStyle, width, height) {
  ctx.save()

  switch (guideLineStyle) {
    case "baseline":
      // Nur Grundlinie
      ctx.beginPath()
      ctx.strokeStyle = "#aaaaaa"
      ctx.lineWidth = 1
      ctx.moveTo(0, height * 0.7)
      ctx.lineTo(width, height * 0.7)
      ctx.stroke()
      break

    case "twoLines":
      // Grundlinie und obere Linie
      ctx.beginPath()
      ctx.strokeStyle = "#aaaaaa"
      ctx.lineWidth = 1
      // Grundlinie
      ctx.moveTo(0, height * 0.7)
      ctx.lineTo(width, height * 0.7)
      // Obere Linie (x-Höhe)
      ctx.moveTo(0, height * 0.3)
      ctx.lineTo(width, height * 0.3)
      ctx.stroke()
      break

    case "fourLines":
      // Vier Linien für Ober-, Mittel-, Grund- und Unterlänge
      ctx.beginPath()
      ctx.strokeStyle = "#aaaaaa"
      ctx.lineWidth = 1
      // Oberlänge
      ctx.moveTo(0, height * 0.1)
      ctx.lineTo(width, height * 0.1)
      // Obere Linie (x-Höhe)
      ctx.moveTo(0, height * 0.3)
      ctx.lineTo(width, height * 0.3)
      // Grundlinie
      ctx.moveTo(0, height * 0.7)
      ctx.lineTo(width, height * 0.7)
      // Unterlänge
      ctx.moveTo(0, height * 0.9)
      ctx.lineTo(width, height * 0.9)
      ctx.stroke()
      break
  }

  ctx.restore()
}

// Speichert ein Canvas als Bild mit transparentem Hintergrund
function saveCanvasWithTransparentBackground(canvas, guideLineStyle) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null

  // Erstelle ein temporäres Canvas für die Extraktion des Zeichens
  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })
  if (!tempCtx) return null

  // Kopiere nur die Zeichnung (ohne Hilfslinien)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Erstelle ein neues ImageData-Objekt mit transparentem Hintergrund
  const newImageData = tempCtx.createImageData(canvas.width, canvas.height)
  const newData = newImageData.data

  // Kopiere nur die nicht-weißen und nicht-grauen Pixel (die Zeichnung)
  for (let i = 0; i < data.length; i += 4) {
    // Überprüfe, ob der Pixel zur Zeichnung gehört (nicht weiß oder grau)
    const isGuidelineGray = data[i] === data[i + 1] && data[i + 1] === data[i + 2] && data[i] > 150

    if (!isGuidelineGray && data[i + 3] > 0) {
      // Kopiere den Pixel
      newData[i] = data[i] // R
      newData[i + 1] = data[i + 1] // G
      newData[i + 2] = data[i + 2] // B
      newData[i + 3] = data[i + 3] // A
    } else {
      // Transparenter Pixel
      newData[i + 3] = 0
    }
  }

  // Setze das neue Bild auf das temporäre Canvas
  tempCtx.putImageData(newImageData, 0, 0)

  // Gib die Daten-URL zurück
  return tempCanvas.toDataURL("image/png")
}

// PDF-Export mit html2canvas und jsPDF
async function exportToPDF(element, paperColor) {
  try {
    // Temporär die Größe für den Export anpassen
    const originalWidth = element.style.width
    const originalHeight = element.style.height
    const originalOverflow = element.style.overflow

    // A4 Proportionen für den Export
    element.style.width = "210mm"
    element.style.height = "297mm"
    element.style.overflow = "hidden"

    // Stelle sicher, dass der Hintergrund korrekt gesetzt ist
    const originalBg = element.style.backgroundColor
    element.style.backgroundColor = paperColor

    // Warte kurz, damit die Änderungen angewendet werden
    await new Promise((resolve) => setTimeout(resolve, 100))

    const canvas = await html2canvas(element, {
      scale: 2, // Reduzierte Skalierung für bessere Kompatibilität
      backgroundColor: paperColor,
      logging: true, // Aktiviere Logging für Fehlerbehebung
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0, // Kein Timeout für Bilder
    })

    // Zurück zu den ursprünglichen Dimensionen
    element.style.width = originalWidth
    element.style.height = originalHeight
    element.style.overflow = originalOverflow
    element.style.backgroundColor = originalBg

    // A4 Maße in mm
    const a4Width = 210
    const a4Height = 297

    // PDF im A4-Format erstellen
    const pdf = new jspdf.jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Bild an A4-Größe anpassen
    const imgData = canvas.toDataURL("image/jpeg", 1.0) // Höchste Qualität
    pdf.addImage(imgData, "JPEG", 0, 0, a4Width, a4Height)
    pdf.save("handschrift.pdf")

    return true
  } catch (error) {
    console.error("Fehler beim PDF-Export:", error)
    return false
  }
}

// Einfacher PDF-Export mit direktem Text
function exportSimplePDF(text, textColor) {
  try {
    // A4 Maße in mm
    const a4Width = 210
    const a4Height = 297

    // PDF im A4-Format erstellen
    const pdf = new jspdf.jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Text direkt ins PDF schreiben
    const lines = text.split("\n")
    pdf.setTextColor(textColor.replace("#", ""))
    pdf.setFont("helvetica")
    pdf.setFontSize(12)

    let y = 20 // Startposition
    lines.forEach((line) => {
      pdf.text(line, 20, y)
      y += 8 // Zeilenabstand
    })

    pdf.save("handschrift_text.pdf")
    return true
  } catch (error) {
    console.error("Fehler beim einfachen PDF-Export:", error)
    return false
  }
}

// Exportiert ein Element als Bild
async function exportToImage(element, paperColor) {
  try {
    const canvas = await html2canvas(element, {
      scale: 4, // Höhere Skalierung für bessere Qualität
      backgroundColor: paperColor,
      logging: false,
      useCORS: true,
      allowTaint: true,
    })

    // Bild herunterladen
    const link = document.createElement("a")
    link.download = "handschrift.png"
    link.href = canvas.toDataURL("image/png", 1.0)
    link.click()

    return true
  } catch (error) {
    console.error("Fehler beim Bild-Export:", error)
    return false
  }
}
