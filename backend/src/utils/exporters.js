const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const logger = require('./logger');

class DataExporter {
  // Exportar a CSV
  static async exportToCSV(data, fields) {
    try {
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      return csv;
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  // Exportar a Excel
  static async exportToExcel(data, config) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(config.sheetName || 'Datos');

      // Configurar columnas
      if (config.columns) {
        worksheet.columns = config.columns;
      } else {
        // Auto-generar columnas desde los datos
        if (data.length > 0) {
          worksheet.columns = Object.keys(data[0]).map(key => ({
            header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            key: key,
            width: 15
          }));
        }
      }

      // Agregar datos
      worksheet.addRows(data);

      // Aplicar estilos
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Auto-ajustar columnas
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, cell => {
          const length = cell.value ? cell.value.toString().length : 0;
          if (length > maxLength) {
            maxLength = length;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });

      // Generar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  // Exportar a PDF
  static async exportToPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(20)
           .text(reportData.title || 'Reporte de Facebook Ads', 50, 50);
        
        doc.fontSize(10)
           .text(`Generado el: ${new Date().toLocaleDateString('es-MX')}`, 50, 80);
        
        if (reportData.dateRange) {
          doc.text(`Período: ${reportData.dateRange.start} - ${reportData.dateRange.end}`, 50, 95);
        }

        doc.moveDown();

        // Resumen ejecutivo
        if (reportData.summary) {
          doc.fontSize(14)
             .text('Resumen Ejecutivo', 50, 130);
          
          doc.fontSize(10)
             .text('', 50, 150);

          Object.entries(reportData.summary).forEach(([key, value], index) => {
            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
            doc.text(`${label}: ${this.formatValue(key, value)}`, 50, 170 + (index * 15));
          });
        }

        // Métricas principales
        if (reportData.metrics && reportData.metrics.length > 0) {
          doc.addPage();
          doc.fontSize(14)
             .text('Métricas Detalladas', 50, 50);
          
          doc.fontSize(10);
          
          // Tabla de métricas
          let yPosition = 80;
          const pageHeight = doc.page.height - 100;

          // Headers
          const headers = Object.keys(reportData.metrics[0]);
          const columnWidth = 500 / headers.length;
          
          headers.forEach((header, index) => {
            doc.text(
              header.charAt(0).toUpperCase() + header.slice(1).replace(/_/g, ' '),
              50 + (index * columnWidth),
              yPosition,
              { width: columnWidth, align: 'left' }
            );
          });

          yPosition += 20;
          doc.moveTo(50, yPosition)
             .lineTo(550, yPosition)
             .stroke();
          
          yPosition += 10;

          // Datos
          reportData.metrics.forEach((row, rowIndex) => {
            if (yPosition > pageHeight) {
              doc.addPage();
              yPosition = 50;
            }

            headers.forEach((header, colIndex) => {
              doc.text(
                this.formatValue(header, row[header]),
                50 + (colIndex * columnWidth),
                yPosition,
                { width: columnWidth, align: 'left' }
              );
            });

            yPosition += 20;
          });
        }

        // Gráficos (placeholder)
        if (reportData.charts) {
          doc.addPage();
          doc.fontSize(14)
             .text('Visualizaciones', 50, 50);
          
          doc.fontSize(10)
             .text('Los gráficos se mostrarán en la versión web del reporte', 50, 80);
        }

        // Footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .text(
               `Página ${i + 1} de ${pages.count}`,
               50,
               doc.page.height - 50,
               { align: 'center' }
             );
        }

        doc.end();
      } catch (error) {
        logger.error('Error exporting to PDF:', error);
        reject(error);
      }
    });
  }

  // Formatear valores según tipo
  static formatValue(key, value) {
    if (value === null || value === undefined) return '-';
    
    if (key.includes('spend') || key.includes('revenue') || key.includes('cost')) {
      return `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    if (key.includes('ctr') || key.includes('rate') || key.includes('percentage')) {
      return `${Number(value).toFixed(2)}%`;
    }
    
    if (key.includes('roas')) {
      return `${Number(value).toFixed(2)}x`;
    }
    
    if (key.includes('impressions') || key.includes('clicks') || key.includes('conversions')) {
      return Number(value).toLocaleString('es-MX');
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString('es-MX');
    }
    
    return value.toString();
  }

  // Generar nombre de archivo
  static generateFileName(type, format) {
    const date = new Date().toISOString().split('T')[0];
    const typeMap = {
      performance: 'rendimiento',
      campaigns: 'campanas',
      audience: 'audiencias',
      creative: 'creatividades',
      custom: 'personalizado'
    };
    
    const reportType = typeMap[type] || type;
    return `reporte-${reportType}-${date}.${format}`;
  }
}

module.exports = DataExporter;