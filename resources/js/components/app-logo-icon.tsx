import { ImgHTMLAttributes } from 'react';
import logo from '@/assets/logo_leonor_cerna 2.png';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src={logo}
            alt="Logo I.E. Leonor Cerna de Valdiviezo"
            {...props}
            className={`${props.className || ''}`}
            onError={() => {
                // Error silenciado
            }}
            onLoad={() => {
                // Logo cargado
            }}
        />
    );
}
