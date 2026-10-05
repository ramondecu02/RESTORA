/** Inserta datos estructurados (schema.org) como JSON-LD. El «<» se escapa para que un texto con «</script>» no pueda cerrar la etiqueta. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
