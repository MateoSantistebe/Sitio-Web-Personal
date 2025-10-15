// Efectos cybersigilsm minimalistas
document.addEventListener('DOMContentLoaded', function() {
    // Efecto glitch aleatorio en elementos - CORREGIDO: verificar que existen
    const glitchElements = document.querySelectorAll('h1, h2, .project-card');
    
    // Solo ejecutar si hay elementos glitchElements
    if (glitchElements.length > 0) {
        setInterval(() => {
            if (Math.random() > 0.8) {
                const randomElement = glitchElements[Math.floor(Math.random() * glitchElements.length)];
                randomElement.classList.add('glitch-effect');
                setTimeout(() => {
                    randomElement.classList.remove('glitch-effect');
                }, 300);
            }
        }, 5000);
    }

    // Manejo del formulario de contacto
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Efecto de envío minimalista
            submitBtn.textContent = 'ENVIANDO...';
            submitBtn.style.background = 'var(--pure-white)';
            submitBtn.style.color = 'var(--pure-black)';
            
            setTimeout(() => {
                const formData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    message: document.getElementById('message').value
                };
                
                console.log('Datos del formulario:', formData);
                
                // Confirmación
                submitBtn.textContent = 'ENVIADO';
                
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.style.background = 'var(--pure-black)';
                    submitBtn.style.color = 'var(--pure-white)';
                    contactForm.reset();
                }, 2000);
                
            }, 1500);
        });
    }

    // Efecto hover sutil para tarjetas - CORREGIDO: verificar que existen
    const cards = document.querySelectorAll('.project-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.borderColor = 'var(--pure-white)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.borderColor = 'var(--border-color)';
        });
    });
});