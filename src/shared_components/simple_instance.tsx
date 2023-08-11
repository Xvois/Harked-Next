import React from "react";

export const SimpleInstance = ({possessive, title, description, children}: {
    possessive: string,
    title: string,
    description: React.ReactNode,
    children: React.ReactNode
}) => {
    return (
        <div className={'simple-instance'}>
            <div className={'section-header'}>
                <div style={{maxWidth: '400px'}}>
                    <p style={{
                        margin: '16px 0 0 0',
                        textTransform: 'uppercase'
                    }}>{possessive}</p>
                    <h2 style={{margin: '0', textTransform: 'uppercase'}}>{title}</h2>
                    {description}
                </div>
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: '10px',
                width: '100%'
            }}>
                {children}
            </div>
        </div>
    )
}