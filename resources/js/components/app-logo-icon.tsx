import { ImgHTMLAttributes } from 'react';
//import logo from '@/assets/logo.png';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            /* src={logo} */
            alt="Logo"
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
