Add-Type -AssemblyName System.Drawing  
 = [System.Drawing.Image]::FromFile('assets\img\logo_wear.png')  
.Save('assets\img\logo_wear_real.png', [System.Drawing.Imaging.ImageFormat]::Png)  
.Dispose() 
