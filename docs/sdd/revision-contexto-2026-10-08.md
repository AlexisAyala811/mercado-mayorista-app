# Revisión del contexto C4

El 8 de octubre de 2026 el usuario solicita adaptar el nivel 1 a la referencia académica. Se actualizan Nivel1-DiagramadeContextodelSistema.md, nivel1-contexto.png y su SVG en el repositorio académico.

Mercado se representa como un sistema único, con Mayorista y Encargado como personas usuarias. Proveedores, compradores, transportistas y estibadores son participantes registrados sin acceso definido. La única integración externa representada es el destino genérico de un PDF compartido por decisión del Mayorista. No se presume proveedor ni canal externo de avisos seleccionado.

La vista excluye tecnologías, bases de datos y módulos internos, que pertenecen a niveles siguientes. Mantiene el alcance sin saldo de mercadería, saldos financieros y reemplazo vigente para el Encargado. No altera permisos ni contratos operativos.

Verificación: alcance/actores contra las historias vigentes, revisión visual de relaciones y textos, integridad PNG, XML SVG, vínculos y diff. No se añaden diagramas Mermaid ni servicios del ejemplo marketplace.
