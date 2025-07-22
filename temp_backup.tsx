  // Helper function to generate category HTML blocks
  const generateCategoriesHTML = () => {
    let html = '';
    
    // Services & Labor Section (RED)
    const validWorkStages = workStages.filter((stage: any) => parseFloat(String(stage.hours)) > 0);
    const validAdditionalLabor = additionalLabor.filter((member: any) => member.name && parseFloat(String(member.hours)) > 0);
    
    if (validWorkStages.length > 0 || validAdditionalLabor.length > 0) {
      html += `
      <div class="w-full">
        <p class="text-red-500 font-semibold mb-1">SERVICES & LABOUR</p>
        <div class="border border-red-500 bg-zinc-900 px-4 py-2">`;
      
      validWorkStages.forEach((stage: any, index: number) => {
        const hours = parseFloat(String(stage.hours)) || 0;
        const total = (hours * stage.rate).toFixed(2);
        const isLast = index === validWorkStages.length - 1 && validAdditionalLabor.length === 0;
        
        html += `
          <div class="flex justify-between ${isLast ? '' : 'border-b border-gray-700'} py-1">
            <span>${stage.description || stage.name}</span>
            <span>$${total}</span>
          </div>`;
      });
      
      validAdditionalLabor.forEach((member: any, index: number) => {
        const hours = parseFloat(String(member.hours)) || 0;
        const rate = parseFloat(String(member.rate)) || 0;
        const total = (hours * rate).toFixed(2);
        const isLast = index === validAdditionalLabor.length - 1;
        
        html += `
          <div class="flex justify-between ${isLast ? '' : 'border-b border-gray-700'} py-1">
            <span>${member.name}</span>
            <span>$${total}</span>
          </div>`;
      });
      
      html += `
        </div>
      </div>`;
    }
    
    // Materials & Paint Section (ORANGE)  
    const materialsTotal = calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal();
    const travelTotal = calculateTravelTotal();
    
    if (materialsTotal > 0 || travelTotal > 0) {
      html += `
      <div class="w-full">
        <p class="text-orange-500 font-semibold mb-1">MATERIALS & PAINT</p>
        <div class="border border-orange-500 bg-zinc-900 px-4 py-2">`;
      
      if (materialsTotal > 0) {
        html += `
          <div class="flex justify-between ${travelTotal > 0 ? 'border-b border-gray-700' : ''} py-1">
            <span>Paint & Supplies</span>
            <span>$${materialsTotal.toFixed(2)}</span>
          </div>`;
      }
      
      if (travelTotal > 0) {
        html += `
          <div class="flex justify-between py-1">
            <span>Delivery</span>
            <span>$${travelTotal.toFixed(2)}</span>
          </div>`;
      }
      
      html += `
        </div>
      </div>`;
    }
    
    return html;
  };

  // Generate HTML-based PDF using your custom template
  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      
      // Create HTML content using your template
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estimate PDF</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body class="bg-black text-white font-sans p-12">
    <!-- Logo and Title -->
    <div class="flex flex-col items-center mb-8">
      <div class="h-16 mb-2 flex items-center justify-center">
        <span class="text-2xl font-bold text-white">A-FRAME PAINTING</span>
      </div>
      <h1 class="text-orange-500 text-3xl font-bold">ESTIMATE</h1>
    </div>

    <!-- Recipient & Sender Info -->
    <div class="flex justify-between text-sm mb-10">
      <div>
        <p class="text-gray-300 font-semibold">Estimate For:</p>
        <p>${clientName || 'Client Name'}</p>
        <p>${clientAddress || '123 Client Street'}</p>
        <p>${clientCity || 'Client City'}, ${clientPostal || 'BC'}</p>
        ${clientPhone ? `<p>${clientPhone}</p>` : ''}
        ${clientEmail ? `<p>${clientEmail}</p>` : ''}
      </div>
      <div class="text-right">
        <p class="text-gray-300 font-semibold">From:</p>
        <p>A-Frame Painting</p>
        <p>884 Hayes Rd</p>
        <p>Manson's Landing, BC</p>
        <p>cortespainter@gmail.com</p>
      </div>
    </div>

    <!-- Dynamic Categories Container -->
    <div id="categories" class="space-y-8">
      ${generateCategoriesHTML()}
    </div>

    <!-- Estimate Total -->
    <div class="flex justify-end mt-10">
      <div class="w-full max-w-sm">
        <div class="flex justify-between border-t border-gray-700 pt-4">
          <span class="text-lg">Subtotal</span>
          <span class="text-lg">$${calculateSubtotal().toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-green-700 text-white px-4 py-2 mt-2">
          <span class="text-xl font-bold">Estimate Total</span>
          <span class="text-xl font-bold">$${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Validity Note -->
    <div class="text-center text-sm text-gray-400 mt-8">
      <p>This estimate is valid for the next 30 days after we will discuss options with you before proceeding.</p>
    </div>
  </body>
</html>`;

      // Create a temporary element to render the HTML
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups.');
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
      
      toast({
        title: "Success",
        description: "Estimate PDF opened for download",
      });
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };