
import { Star } from 'lucide-react';

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Dr. Maria Silva',
      role: 'Clínica Odontológica',
      image: 'https://probotec.com.br/wp-content/uploads/2025/05/cropped-probotec.png',
      rating: 5,
      comment: 'Revolucionou nossa clínica! Os agendamentos online reduziram nossa carga administrativa em 70% e os pacientes adoram a praticidade.'
    },
    {
      name: 'Dr. João Santos',
      role: 'Clínica Médica',
      image: 'https://probotec.com.br/wp-content/uploads/2025/05/cropped-probotec.png',
      rating: 5,
      comment: 'Interface muito intuitiva e suporte excepcional. Conseguimos organizar melhor nossos atendimentos e aumentar a satisfação dos pacientes.'
    },
    {
      name: 'Dra. Ana Costa',
      role: 'Clínica de Fisioterapia',
      image: 'https://probotec.com.br/wp-content/uploads/2025/05/cropped-probotec.png',
      rating: 5,
      comment: 'Os relatórios detalhados me ajudam muito na gestão. Posso acompanhar o desempenho da clínica e tomar decisões mais assertivas.'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            O que nossos clientes dizem
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Mais de 1.000 clínicas já confiam em nossa solução
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.comment}"
              </p>
              <div className="flex items-center">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
