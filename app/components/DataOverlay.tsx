import type { ReactNode } from "react";

interface DataOverlayProps {
	children: ReactNode;
	isLiveData: boolean;
	dataSource?: string;
	className?: string;
}

export default function DataOverlay({ 
	children, 
	isLiveData, 
	dataSource,
	className = "" 
}: DataOverlayProps) {
	if (isLiveData) {
		return <>{children}</>;
	}

	return (
		<div className={`relative ${className}`}>
			{children}
			<div className="absolute inset-0 bg-gray-400 bg-opacity-40 flex items-center justify-center z-10 pointer-events-none">
				<div className="bg-gray-800 bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm font-medium">
					<div className="flex items-center space-x-2">
						<span className="text-yellow-400">⚠️</span>
						<span>
							{dataSource === 'enhanced_calculation' 
								? 'Using Mock Data' 
								: dataSource === 'error'
								? 'Data Error'
								: 'Demo Data'
							}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
