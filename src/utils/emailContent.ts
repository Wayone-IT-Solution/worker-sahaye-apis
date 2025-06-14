const contactUsContent = (
  senderName: string,
  senderEmail: string,
  query: string,
  reply: string,
): string => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
      <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333; font-size: 24px; font-weight: bold;">Contact Query from ${senderName}</h2>
        <p style="color: #555; font-size: 16px;">We have received a new query from the following user:</p>
        <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
        
        <h3 style="color: #007bff;">User Details:</h3>
        <ul style="color: #555; font-size: 16px; list-style-type: none; padding: 0;">
          <li><strong>Name:</strong> ${senderName}</li>
          <li><strong>Email:</strong> ${senderEmail}</li>
        </ul>
        
        <h3 style="color: #007bff;">User's Message:</h3>
        <p style="color: #555; font-size: 16px;">${query}</p>
        
        <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
        
        <h3 style="color: #007bff;">Our Reply:</h3>
        <p style="color: #555; font-size: 16px; font-style: italic;">${reply}</p>
        
        <br>
        <p style="color: #555; font-size: 16px;">Best regards,</p>
        <p style="color: #333; font-size: 16px; font-weight: bold;">Team [Your Company Name]</p>
      </div>
    </div>
  `;
};
